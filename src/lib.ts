const SPEED_MIN      = 0.8,
      SPEED_MAX      = 2.0,
      SPEED_INTERVAL = 0.2,
      COOKIE_AGE_DAYS = 1,
      INTERVAL_DELAY_SECS = 10;



// Time class

export class PlayTime {
    h: number
    m: number
    s: number
    
    constructor(h: number, m: number, s: number) {
        this.h = h; this.m = m; this.s = s;
    }
    
    fmt(): string {
        return (this.h === 0) ? `${this.m}:${String(this.s).padStart(2,"0")}` : `${this.h}:${String(this.m).padStart(2,"0")}:${String(this.s).padStart(2,"0")}`
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
        return new PlayTime(
            (time[2] !== undefined) ? parseInt(time[2]) : 0,
            parseInt(time[3]),
            parseInt(time[4])
        )
    }
}



// Check / Get

export const hostname_check = (): boolean => {
    return location.hostname === "kenjaplusv.satt.jp"
};

export const get_lesson_id = (): string | null => {
    const id = (location.pathname).match(/kenjaplus-satenet-1H0\/subjects\/([0-9]+)\/courses\/([0-9]+)\/materials\/([0-9]+)/);
    return (id !== null) ? `${id[1]}-${id[2]}-${id[3]}` : null
};

export const is_running = (window: any): boolean => {
    return typeof window.savicon_running_flag !== undefined
}

export const running = (window: any) => {
    window.savicon_running_flag = true;
}

export const get_video_element = (): HTMLVideoElement | null => {
    const video = document.getElementsByTagName("video")[0];
    return (video !== undefined) ? video : null
}



// Commands

export const play_toggle = (video: HTMLVideoElement) => {
    if (video.paused) video.play(); else video.pause();
}

export const absolute_jump = (video: HTMLVideoElement, playtime: PlayTime) => {
    video.currentTime = playtime.to_secs();
}

export const relative_jump = (video: HTMLVideoElement, time: number) => {
    video.currentTime += time;
}

export const speed_faster = (video: HTMLVideoElement) => {
    if (video.playbackRate <= SPEED_MAX - SPEED_INTERVAL) video.playbackRate += SPEED_INTERVAL;
}

export const speed_slower = (video: HTMLVideoElement) => {
    if (SPEED_MIN + SPEED_INTERVAL <= video.playbackRate) video.playbackRate -= SPEED_INTERVAL;
}

const save_playtime = (video: HTMLVideoElement, id: string) => {
    document.cookie = `${id}=${Math.floor(video.currentTime)}; Max-age=${86400*COOKIE_AGE_DAYS}`;
}

export const create_save_cycle = (video: HTMLVideoElement, id: string) => {
    setInterval(() => { save_playtime(video, id); }, 1000*INTERVAL_DELAY_SECS);
}

export const load_playtime = (video: HTMLVideoElement, id: string, confirm: (time: PlayTime) => boolean) => {
    const match_result = (document.cookie).match(`${id}=([0-9]+)`);
    if (match_result === null) { return }
    
    const playtime = PlayTime.from_secs(parseInt(match_result[1]));
    if (confirm(playtime)) { absolute_jump(video, playtime); }
}


// Input

export const input_playtime = (input_message: string, error_message: string): PlayTime | null => {
    const inp = prompt(input_message)!;
    // todo
    return PlayTime.try_from_string(inp)
}
