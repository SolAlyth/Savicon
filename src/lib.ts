const
    COOKIE_AGE_DAYS     = 1,
    REWIND_DETECT_MIN_SECS       = 30,
    REWIND_DETECT_DISTANCE_SECS  = 600,
    INTERVAL_DELAY_SECS = 10;



// if_not_null function

const if_not_null = <T, U>(value: T | null, func: (value: T) => U): U | null => {
    return (value !== null) ? func(value) : null
};



// Option class

class Option<T> {
    private value: T | undefined
    
    private constructor(value?: T) {
        this.value = value;
    }
    
    static from_undef<T>(value: T | undefined): Option<T> {
        return new Option(value)
    }
    
    static some<T>(value: T): Option<T> {
        return new Option(value)
    }
    
    static none<T>(): Option<T> {
        return new Option<T>()
    }
    
    is_some(): boolean {
        return this.value !== undefined
    }
    
    is_none(): boolean {
        return this.value === undefined
    }
    
    unwrap(): T | undefined {
        return this.value
    }
}


// Time class

export class PlayTime {
    h: number
    m: number
    s: number
    
    constructor(h: number, m: number, s: number) {
        this.h = h; this.m = m; this.s = s;
    }
    
    toString(): string {
        return `PlayTime(${this.fmt()})`;
    }
    
    fmt(): string {
        return (this.h === 0) ? `${this.m}:${(this.s).toString().padStart(2,"0")}` : `${this.h}:${(this.m).toString().padStart(2,"0")}:${(this.s).toString().padStart(2,"0")}`
    }
    
    distance(other: PlayTime): number {
        return other.to_secs() - this.to_secs()
    }
    
    to_secs(): number {
        return 3600*this.h + 60*this.m + this.s
    }
    
    static from_secs(from: number): PlayTime {
        const s = from % 60, m = (from - s)/60 % 60, h = (from - 60*m - s)/3600;
        return new PlayTime(h,m,s)
    }
    
    static try_from_string(from: string): PlayTime | null {
        const time = from.match(/(([1-9]):)?([0-5]?[0-9]):([0-5]?[0-9])/);
        if (time === null) { return null }
        return new PlayTime(Number(time[2] ?? 0), Number(time[3]), Number(time[4]))
    }
}



// Key and KeyMap class

export class Key {
    code: string
    shift: Option<boolean>
    
    constructor(code: string, shift?: boolean) {
        this.code = code;
        this.shift = Option.from_undef(shift);
    }
    
    static from_keyboardevent(e: KeyboardEvent) {
        return new Key(e.code, e.shiftKey)
    }
    
    eq(other: Key): boolean {
        if (this.code !== other.code) return false;
        if (this.shift.is_none() || other.shift.is_none()) return true;
        return (this.shift.unwrap() as boolean) === (other.shift.unwrap() as boolean)
    }
}

type KeyConfig = [Key, (() => void) | null, (() => void) | null]

export class Keymap {
    // keymap は Map にしたかったけど Map.get(Key) ができないので Array
    keymap: KeyConfig[]
    listen_func: { keydown: (e: KeyboardEvent) => void, keyup: (e: KeyboardEvent) => void } | undefined
    
    constructor(...keymaps: KeyConfig[]) {
        this.keymap = keymaps;
        this.listen_func = undefined;
    }
    
    has(key: Key): KeyConfig | null {
        return this.keymap.find(keycfg => keycfg[0].eq(key)) ?? null
    }
    
    create_listener(): boolean {
        if (this.listen_func !== undefined) { return false }
        
        this.listen_func = {
            keydown: (e: KeyboardEvent) => {
                const inpkey = Key.from_keyboardevent(e);
                const keycfg = this.has(inpkey);
                if (keycfg !== null && keycfg[1] !== null) {
                    keycfg[1]();
                    
                    // !debug: Keydown Observe
                    console.log(`Keydown: ${inpkey.code}`);
                }
            },
            keyup: (e: KeyboardEvent) => {
                const inpkey = Key.from_keyboardevent(e);
                const keycfg = this.has(inpkey);
                if (keycfg !== null && keycfg[2] !== null) {
                    keycfg[2]();
                    
                    // !debug: Keyup Observe
                    console.log(`Keyup: ${inpkey.code}`);
                }
            }
        };
        document.addEventListener("keydown", this.listen_func.keydown);
        document.addEventListener("keyup", this.listen_func.keyup);
        
        return true
    }
    
    delete_listener(): boolean {
        if (this.listen_func === undefined) { return false }
        
        document.removeEventListener("keydown", this.listen_func.keydown);
        document.removeEventListener("keyup", this.listen_func.keyup);
        this.listen_func = undefined;
        
        return true
    }
}



// Check / Get

export const is_running = (window: { savicon_running_flag: boolean | undefined } ): boolean => {
    return typeof window.savicon_running_flag !== "undefined"
};

export const running = (window: { savicon_running_flag: boolean | undefined } ) => {
    window.savicon_running_flag = true;
};

export const get_video_element = (index: number): HTMLVideoElement | null => {
    return document.getElementsByTagName("video")[index] ?? null;
};



// Commands

const play = (video: HTMLVideoElement) => {
    if (video.readyState >= video.HAVE_FUTURE_DATA) video.play();
    
    video.play().then(
        () => {},
        (err: DOMException) => {
            if (err.message !== "The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22") throw err;
            
            // !debug: ignore DOMException (https://github.com/SolAlyth/Savicon/issues/1)
            console.log(`debug: DOMException is ignored in lib/play (https://github.com/SolAlyth/Savicon/issues/1)`);
        }
    )
};

export const play_toggle = (video: HTMLVideoElement) => {
    if (video.paused) play(video); else video.pause();
};

export const absolute_jump = (video: HTMLVideoElement, playtime: PlayTime) => {
    video.currentTime = playtime.to_secs();
};

export const relative_jump = (video: HTMLVideoElement, time: number) => {
    video.currentTime += time;
};

export const get_speed = (video: HTMLVideoElement): number => {
    return video.playbackRate
}

export const set_speed = (video: HTMLVideoElement, speed: number) => {
    video.playbackRate = speed;
}

export const speed_faster = (video: HTMLVideoElement, interval: number, max: number) => {
    if (video.playbackRate <= max - interval) video.playbackRate += interval;
};

export const speed_slower = (video: HTMLVideoElement, interval: number, min: number) => {
    if (min + interval <= video.playbackRate) video.playbackRate -= interval;
};



// Save / Load

const save_playtime = (video: HTMLVideoElement, id: string, rewind_confirm: (beforept: PlayTime) => boolean) => {
    const video_playtime = PlayTime.from_secs(Math.floor(video.currentTime));
    
    const before_playtime = load_playtime(id);
    
    if (before_playtime !== null && video_playtime.to_secs() < REWIND_DETECT_MIN_SECS && video_playtime.distance(before_playtime) > REWIND_DETECT_DISTANCE_SECS) {
        delete_save_cycle(id);
        const rewind = rewind_confirm(before_playtime);
        create_save_cycle(video, id, rewind_confirm);
        if (rewind) { absolute_jump(video, before_playtime); return }
    }
    
    document.cookie = `${id}=${video_playtime.to_secs()}; Max-age=${86400*COOKIE_AGE_DAYS}`;
    
    // !debug: Save Observe
    console.log(`Save: ${video_playtime}`);
};

let save_interval_id_map: Map<string, number> = new Map();

export const create_save_cycle = (video: HTMLVideoElement, id: string, rewind_confirm: (beforept: PlayTime) => boolean): boolean => {
    if (save_interval_id_map.has(id)) return false;
    const interval_id = window.setInterval(() => save_playtime(video, id, rewind_confirm), 1000*INTERVAL_DELAY_SECS);
    save_interval_id_map.set(id, interval_id); return true
};

export const delete_save_cycle = (id: string): boolean => {
    const interval_id = save_interval_id_map.get(id);
    if (interval_id === undefined) return false;
    clearInterval(interval_id);
    save_interval_id_map.delete(id);
    return true
}

const load_playtime = (id: string): PlayTime | null => {
    const match_result = (document.cookie).match(`${id}=([0-9]+)`);
    return if_not_null(match_result, (matcharr) => PlayTime.from_secs(Number(matcharr[1])))
}

export const jump_saved_time = (video: HTMLVideoElement, id: string, confirm: (time: PlayTime) => boolean): boolean => {
    const playtime = load_playtime(id);
    if (playtime === null || !confirm(playtime)) return false;
    absolute_jump(video, playtime); return true;
};
