const
    COOKIE_AGE_DAYS     = 1,
    INTERVAL_DELAY_SECS = 10;



// if_not_null function

const if_not_null = <T, U>(value: T | null, func: (value: T) => U): U | null => {
    return (value !== null) ? func(value) : null
};

// Time class

export class PlayTime {
    h: number
    m: number
    s: number
    
    constructor(h: number, m: number, s: number) {
        this.h = h; this.m = m; this.s = s;
    }
    
    fmt(): string {
        return (this.h === 0) ? `${this.m}:${(this.s).toString().padStart(2,"0")}` : `${this.h}:${(this.m).toString().padStart(2,"0")}:${(this.s).toString().padStart(2,"0")}`
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



/// Key and KeyMap class

export class Key {
    code: string
    shift: boolean
    
    constructor(code: string);
    constructor(code: string, shift: boolean);
    
    constructor(code: string, shift?: boolean) {
        this.code = code;
        this.shift = shift ?? false;
    }
    
    eq(other: Key): boolean {
        return (this.code === other.code) && (this.shift === other.shift)
    }
}

type KeyConfig = [Key, () => void]

export class Keymap {
    // keymap は Map にしたかったけど Map.get(Key) ができないので Array
    keymap: KeyConfig[]
    listen_func: ((e: KeyboardEvent) => void) | undefined
    
    constructor(...keymaps: KeyConfig[]) {
        this.keymap = keymaps;
        this.listen_func = undefined;
    }
    
    has(key: Key): KeyConfig | null {
        return this.keymap.find(keycfg => keycfg[0].eq(key)) ?? null
    }
    
    create_listener(): boolean {
        if (this.listen_func !== undefined) { return false }
        
        this.listen_func = (e: KeyboardEvent) => {
            const inpkey = new Key(e.code, e.shiftKey);
            const keycfg = this.has(inpkey);
            if (keycfg !== null) keycfg[1]();
        };
        document.addEventListener("keydown", this.listen_func);
        
        return true
    }
    
    remove_listener(): boolean {
        if (this.listen_func === undefined) { return false }
        
        document.removeEventListener("keydown", this.listen_func);
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
            
            // !debug: DOMException occur in lib/play (https://github.com/SolAlyth/Savicon/issues/1)
            console.log(`debug: DOMException occur in lib/play (https://github.com/SolAlyth/Savicon/issues/1)`);
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

export const speed_faster = (video: HTMLVideoElement, max: number, interval: number) => {
    if (video.playbackRate <= max - interval) video.playbackRate += interval;
};

export const speed_slower = (video: HTMLVideoElement, min: number, interval: number) => {
    if (min + interval <= video.playbackRate) video.playbackRate -= interval;
};

const save_playtime = (video: HTMLVideoElement, id: string) => {
    document.cookie = `${id}=${Math.floor(video.currentTime)}; Max-age=${86400*COOKIE_AGE_DAYS}`;
};

export const create_save_cycle = (video: HTMLVideoElement, id: string) => {
    setInterval(() => { save_playtime(video, id); }, 1000*INTERVAL_DELAY_SECS);
};

const load_playtime = (id: string): PlayTime | null => {
    const match_result = (document.cookie).match(`${id}=([0-9]+)`);
    return if_not_null(match_result, (matcharr) => PlayTime.from_secs(Number(matcharr[1])))
}

export const jump_saved_time = (video: HTMLVideoElement, id: string, confirm: (time: PlayTime) => boolean): boolean => {
    const playtime = load_playtime(id);
    if (playtime === null || !confirm(playtime)) return false;
    absolute_jump(video, playtime); return true;
};
