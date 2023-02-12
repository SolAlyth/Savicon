import {
    Key, Keymap, PlayTime,
    
    is_running, running, get_video_element,
    
    play_toggle, absolute_jump, relative_jump, speed_faster, speed_slower,
    create_save_cycle, jump_saved_time
} from "./lib";



const hostname_check = (): boolean => {
    return location.hostname === "kenjaplusv.satt.jp"
};

const get_lesson_id = (): string | null => {
    const id = (location.pathname).match(/kenjaplus-satenet-1H0\/subjects\/([0-9]+)\/courses\/([0-9]+)\/materials\/([0-9]+)/);
    return (id !== null) ? `${id[1]}-${id[2]}-${id[3]}` : null
};

const input_playtime = (input_message: string, error_message: string): PlayTime | null => {
    const inp: string | null = prompt(input_message);
    if (inp === null) return null;
    
    const playtime = PlayTime.try_from_string(inp);
    if (playtime === null) alert(error_message);
    
    return playtime
};



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
    
    const keymap = new Keymap(
        [ new Key("Space"), () => play_toggle(video) ],
        [ new Key("ArrowLeft"), () => relative_jump(video, -5) ],
        [ new Key("ArrowRight"), () => relative_jump(video, 5) ],
        [ new Key("Comma", true), () => speed_slower(video) ],
        [ new Key("Period", true), () => speed_faster(video) ],
        [ new Key("KeyJ"), () => {
            const playtime = input_playtime("ジャンプ先の時間を入力してください。\nh:mm:ss または mm:ss の形式で入力してください。", "Error: 正しくない形式で入力されている可能性があります。");
            if (playtime !== null) absolute_jump(video, playtime);
        } ]
    );
    
    keymap.create_listener();
    create_save_cycle(video, lesson_id);
    
    return true
}
