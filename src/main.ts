import {
    Key, Keymap, PlayTime,
    
    is_running, running, get_video_element,
    
    play_toggle, absolute_jump, relative_jump, speed_faster, speed_slower, get_speed, set_speed,
    create_save_cycle, jump_saved_time
} from "./lib";



const if_not_null = <T, U>(value: T | null, func: (value: T) => U): U | null => {
    return (value !== null) ? func(value) : null
};



const hostname_check = (): boolean => {
    return location.hostname === "kenjaplusv.satt.jp"
};

const get_lesson_id = (): string | null => {
    const id_result = (location.pathname).match(/kenjaplus-satenet-1H0\/subjects\/([0-9]+)\/courses\/([0-9]+)\/materials\/([0-9]+)/);
    return if_not_null(id_result, (idarr) => `${idarr[1]}-${idarr[2]}-${idarr[3]}`)
};

const input_playtime = (input_message: string, error_message: string): PlayTime | null => {
    const inp: string | null = prompt(input_message);
    if (inp === null) return null;
    
    const playtime = PlayTime.try_from_string(inp);
    if (playtime === null) alert(error_message);
    
    return playtime
};



class FastPlay {
    video: HTMLVideoElement
    toggle: boolean
    speed_tmp: number
    
    constructor(video: HTMLVideoElement) {
        this.video = video;
        this.toggle = false;
        this.speed_tmp = 0;
    }
    
    on(): boolean {
        if (this.toggle) return false;
        
        this.speed_tmp = get_speed(this.video);
        set_speed(this.video, 10.0);
        this.toggle = true;
        return true
    }
    
    off(): boolean {
        if (!this.toggle) return false;
        
        set_speed(this.video, this.speed_tmp);
        this.toggle = false;
        return true
    }
}



export const main = (window: { savicon_running_flag: boolean | undefined }): boolean => {
    if (!hostname_check()) { alert("Error: 駿台サテネット(kenjaplusv.satt.jp) にのみ対応しています。"); return false }
    
    const lesson_id = get_lesson_id();
    if (lesson_id === null) { alert("Error: 動画視聴のページでない可能性があります。"); return false }
    
    if (window === undefined) { alert("Error: 引数が指定されていません。\n心当たりが無い場合は、開発者に問い合わせてください。"); return false }
    if (is_running(window)) { alert("Info: 既に起動しています。"); return false }
    
    const video = get_video_element(0);
    if (video === null) { alert("Error: 動画が見つかりませんでした。"); return false }
    
    running(window);
    
    jump_saved_time(video, lesson_id, (playtime) => { return confirm(`${playtime.fmt()} から再開しますか？`) });
    
    const fastplay = new FastPlay(video);
    
    const keymap = new Keymap(
        [ new Key("Space"), () => play_toggle(video), null],
        [ new Key("ArrowLeft"), () => relative_jump(video, -5), null ],
        [ new Key("ArrowRight"), () => relative_jump(video, 5), null ],
        [ new Key("Comma", true), () => speed_slower(video, 0.2, 0.8), null ],
        [ new Key("Period", true), () => speed_faster(video, 0.2, 2.0), null ],
        [ new Key("KeyJ"), () => {
            const playtime = input_playtime("ジャンプ先の時間を入力してください。\nh:mm:ss または mm:ss の形式で入力してください。", "Error: 正しくない形式で入力されている可能性があります。");
            if (playtime !== null) absolute_jump(video, playtime);
        }, null ]
        
        // !test-start: fastplay
        ,[ new Key("KeyM"), () => fastplay.on(), () => fastplay.off() ],
        // !test-end: fastplay
    );
    
    keymap.create_listener();
    create_save_cycle(video, lesson_id, (beforept) => confirm(`長時間の前方向のジャンプを検出しました。\n${beforept.fmt()} に戻りますか？`));
    
    return true
};
