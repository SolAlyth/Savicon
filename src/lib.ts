// if_not_null function

export const if_null = <T>(value: NonNullable<T> | null, func: () => void): T | null => {
    const f = () => { func(); return null; };
    return (value !== null) ? value : f();
    
};

export const if_not_null = <T, U>(value: NonNullable<T> | null, func: (value: T) => U): U | null => {
    return (value !== null) ? func(value) : null;
};



// Option class

class Option<T> {
    private value: T | undefined;
    
    private constructor(value?: T | undefined) {
        this.value = value;
    }
    
    static from_undef<T>(value: T | undefined): Option<T> {
        return new Option(value);
    }
    
    static some<T>(value: T): Option<T> {
        return new Option(value);
    }
    
    static none<T>(): Option<T> {
        return new Option<T>();
    }
    
    is_some(): boolean {
        return this.value !== undefined;
    }
    
    is_none(): boolean {
        return this.value === undefined;
    }
    
    unwrap(): T {
        return this.value as T
    }
    
    optmatch<U>(func: {some: (some_value: T) => U, none: () => U}): U {
        return (this.value !== undefined) ? func.some(this.value) : func.none();
    }
    
    if_all_some<U>(opts: Option<T>[], func: { all: (...some_values: T[]) => U, other: () => U }): U {
        return (opts.every(opt => opt.is_some())) ? func.all(...opts.map(opt => opt.unwrap())) : func.other()
    }
}



// Time class

export class PlayTime {
    h: number;
    m: number;
    s: number;
    
    private constructor(h: number, m: number, s: number) {
        this.h = h; this.m = m; this.s = s;
    }
    
    toString(): string {
        return `PlayTime(${this.fmt()})`;
    }
    
    fmt(): string {
        return (this.h === 0) ? `${this.m}:${(this.s).toString().padStart(2,"0")}`
                              : `${this.h}:${(this.m).toString().padStart(2,"0")}:${(this.s).toString().padStart(2,"0")}`;
    }
    
    distance(other: PlayTime): number {
        return other.to_secs() - this.to_secs();
    }
    
    to_secs(): number {
        return 3600*this.h + 60*this.m + this.s;
    }
    
    add(time: number): PlayTime {
        return PlayTime.from_secs(this.to_secs() + time);
    }
    
    static from_secs(from: number): PlayTime {
        const sec = Math.max(Math.floor(from), 0);
        const s = sec % 60, m = (sec - s)/60 % 60, h = (sec - 60*m - s)/3600;
        return new PlayTime(h,m,s);
    }
    
    static try_from_string(from: string): PlayTime | null {
        const time_match_result = from.match(/^(([1-9]):)?([0-5]?[0-9]):([0-5]?[0-9])$/);
        return if_not_null(time_match_result, (timearr) => new PlayTime(Number(timearr[2] ?? 0), Number(timearr[3]), Number(timearr[4])));
    }
}



// Key and KeyMap class

export class Key {
    code: string;
    shift: Option<boolean>;
    
    constructor(code: string, shift?: boolean) {
        this.code = code;
        this.shift = Option.from_undef(shift);
    }
    
    toString(): string {
        return this.shift.optmatch({
            some: (sft) => `Key(${this.code}, shift=${sft})`,
            none: () => `Key(${this.code})`
        });
    }
    
    static from_KeyboardEvent(e: KeyboardEvent) {
        return new Key(e.code, e.shiftKey);
    }
    
    eq(other: Key): boolean {
        if (this.code !== other.code) return false;
        return this.shift.if_all_some([this.shift, other.shift], {
            all: (thisshift, othershift) => thisshift === othershift,
            other: () => true
        });
    }
}

type KeyConfig = [Key, (() => void) | null, (() => void) | null];

export class Keymap {
    // keymap は Map にしたかったけど Map.get(Key) ができないので Array
    keymap: KeyConfig[];
    listen_func: { keydown: (e: KeyboardEvent) => void, keyup: (e: KeyboardEvent) => void } | undefined = undefined;
    
    constructor(...keymaps: KeyConfig[]) {
        this.keymap = keymaps;
    }
    
    has(key: Key): KeyConfig | null {
        return this.keymap.find(keycfg => keycfg[0].eq(key)) ?? null;
    }
    
    create_listener(): boolean {
        if (this.listen_func !== undefined) return false;
        
        this.listen_func = {
            keydown: (e: KeyboardEvent) => {
                const inpkey = Key.from_KeyboardEvent(e);
                const keycfg = this.has(inpkey);
                if (keycfg !== null && keycfg[1] !== null) {
                    // !debug: Keydown Observe
                    console.log(`Keydown: ${inpkey.code}`);
                    
                    keycfg[1]();
                }
            },
            keyup: (e: KeyboardEvent) => {
                const inpkey = Key.from_KeyboardEvent(e);
                const keycfg = this.has(inpkey);
                if (keycfg !== null && keycfg[2] !== null) {
                    // !debug: Keyup Observe
                    console.log(`Keyup: ${inpkey.code}`);
                    
                    keycfg[2]();
                }
            }
        };
        document.addEventListener("keydown", this.listen_func.keydown);
        document.addEventListener("keyup", this.listen_func.keyup);
        
        return true;
    }
    
    delete_listener(): boolean {
        if (this.listen_func === undefined) return false;
        
        document.removeEventListener("keydown", this.listen_func.keydown);
        document.removeEventListener("keyup", this.listen_func.keyup);
        this.listen_func = undefined;
        
        return true;
    }
}



// Check / Get

export const is_running = (window: { savicon_running_flag: boolean | undefined } ): boolean => {
    return typeof window.savicon_running_flag !== "undefined";
};

export const running = (window: { savicon_running_flag: boolean | undefined } ) => {
    window.savicon_running_flag = true;
};

export const get_video_element = (index: number): HTMLVideoElement | null => {
    return document.getElementsByTagName("video")[index] ?? null;
};



// Commands

export class VideoController {
    private readonly video: HTMLVideoElement;
    private readonly id: string;
    
    fastplay_speed: number = 2.0;
    private fastplay_flag: boolean = false;
    private fastplay_before_speed: number = 0;
    
    cycle_interval_secs: number = 60;
    private cycle_id: Option<number> = Option.none();
    
    cookie_age_days: number = 1;
    
    judge_rewind: (bpt: PlayTime) => boolean = () => false;
    private before_playtime: PlayTime | undefined = undefined;
    rewind_min_secs: number = 300;
    
    
    private get speed(): number {
        return this.video.playbackRate;
    }
    
    private set speed(spd: number) {
        this.video.playbackRate = spd;
    }
    
    private get playtime(): PlayTime {
        return PlayTime.from_secs(this.video.currentTime);
    }
    
    private set playtime(pt: PlayTime) {
        this.video.currentTime = pt.to_secs();
    }
    
    
    constructor(video: HTMLVideoElement, id: string) {
        this.video = video;
        this.id = id;
    }
    
    
    private play() {
        if (this.video.readyState >= this.video.HAVE_FUTURE_DATA) this.video.play();
        
        this.video.play().then(
            () => {},
            (err: DOMException) => {
                if (err.message !== "The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22") throw err;
                
                // !debug: ignore DOMException (https://github.com/SolAlyth/Savicon/issues/1)
                console.log(`debug: DOMException was ignored in lib/play (https://github.com/SolAlyth/Savicon/issues/1)`);
            }
        );
    }
    
    private pause() {
        this.video.pause();
    }
    
    play_toggle() {
        if (this.video.paused) this.play(); else this.pause();
    }
    
    
    absolute_jump(pt: PlayTime) {
        this.playtime = pt;
        
        // !debug: Jump Observe
        console.log(`jump: ${pt.fmt()}`);
    }
    
    relative_jump(time: number) {
        this.absolute_jump(this.playtime.add(time));
    }
    
    
    speed_faster(interval: number, max: number) {
        if (this.speed <= max - interval) this.speed += interval;
    }
    
    speed_slower(interval: number, min: number) {
        if (min + interval <= this.speed) this.speed -= interval;
    }
    
    
    fastplay_on(): boolean {
        if (this.fastplay_flag) return false;
        
        this.fastplay_before_speed = this.speed;
        this.speed = this.fastplay_speed;
        this.fastplay_flag = true;
        return true;
    }
    
    fastplay_off(): boolean {
        if (!this.fastplay_flag) return false;
        
        this.speed = this.fastplay_before_speed;
        this.fastplay_flag = false;
        return true;
    }
    
    
    load_cookie(): PlayTime | null {
        const ptl = document.cookie.split("; ").flatMap((cookie) => {
            const result = cookie.match(`^${this.id}=([0-9]+)$`);
            return (result !== null) ? [PlayTime.from_secs(Number(result[1]))] : []
        });
        
        return ptl[0] ?? null;
    }
    
    save_cookie() {
        document.cookie = `${this.id}=${this.playtime.to_secs()}; Max-age=${86400*this.cookie_age_days}`;
        
        // !debug: Save Observe
        console.log(`Save: ${this.playtime.fmt()}`);
    }
    
    check_rewind() {
        const pt = this.playtime, bpt = this.before_playtime;
        if (pt === null || bpt === undefined) return;
        
        if (pt.to_secs() < this.cycle_interval_secs && bpt.distance(pt) < -this.rewind_min_secs) {
            if (this.judge_rewind(bpt)) this.absolute_jump(bpt);
        }
    }
    
    create_save_cycle(): boolean {
        if (this.cycle_id.is_some()) return false;
        
        const func = () => {
            this.save_cookie();
            this.check_rewind();
        }
        
        const interval_id = window.setInterval(func, 1000*this.cycle_interval_secs);
        this.cycle_id = Option.some(interval_id);
        
        return true;
    }
    
    delete_save_cycle(): boolean {
        return this.cycle_id.optmatch({
            some: (cycle_id) => {
                clearInterval(cycle_id);
                this.cycle_id = Option.none();
                
                return true;
            },
            none: () => false
        });
    }
}
