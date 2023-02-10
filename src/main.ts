import {
    hostname_check, get_lesson_id, is_running, running, get_video_element,
    play_toggle, absolute_jump, relative_jump, speed_faster, speed_slower,
    create_save_cycle, load_playtime,
    input_playtime
} from "./lib";

export const main = (window: { savicon_running_flag: boolean | undefined }) => {
    if (!hostname_check()) { alert("Error: 駿台サテネット(kenjaplusv.satt.jp) にのみ対応しています。"); return }
    
    const lesson_id = get_lesson_id();
    if (lesson_id === null) { alert("Error: 動画視聴のページでない可能性があります。"); return }
    
    if (window === undefined) { alert("Error: 引数が指定されていません。\n心当たりが無い場合は、開発者に問い合わせてください。"); return }
    if (is_running(window)) { alert("Info: 既に起動しています。"); return }
    
    const video = get_video_element();
    if (video === null) { alert("Error: 動画が見つかりませんでした。"); return }
    
    running(window);
    
    const keymap: {[key: string]: () => void} = {
        "Space": () => play_toggle(video),
        "ArrowLeft": () => relative_jump(video, -5),
        "ArrowRight": () => relative_jump(video, 5),
        "ArrowUp": () => speed_faster(video),
        "ArrowDown": () => speed_slower(video),
        "ShiftLeft": () => {
            const playtime = input_playtime("ジャンプ先の時間を入力してください。\nh:mm:ss または mm:ss の形式で入力してください。", "Error: 正しくない形式で入力されている可能性があります。");
            if (playtime !== null) absolute_jump(video, playtime);
        },
        "ShiftRight": () => {
            const playtime = input_playtime("ジャンプ先の時間を入力してください。\nh:mm:ss または mm:ss の形式で入力してください。", "Error: 正しくない形式で入力されている可能性があります。");
            if (playtime !== null) absolute_jump(video, playtime);
        }
    };
    
    load_playtime(video, lesson_id, (playtime) => { return confirm(`${playtime.fmt()} から再開しますか？`) });
    
    document.onkeydown = (e) => { if (e.code in keymap) keymap[e.code](); };
    create_save_cycle(video, lesson_id);
}
