import {
    if_null, if_not_null,
    
    Key, Keymap, PlayTime,
    
    is_running, running, get_video_element,
    
    VideoController
} from "./lib";



const hostname_check = (): boolean => {
    return location.hostname === "kenjaplusv.satt.jp"
};

const get_lesson_id = (): string | null => {
    const id_result = (location.pathname).match(/kenjaplus-satenet-1H0\/subjects\/([0-9]+)\/courses\/([0-9]+)\/materials\/([0-9]+)/);
    return if_not_null(id_result, (idarr) => `${idarr[1]}-${idarr[2]}-${idarr[3]}`)
};

const input_playtime = (): PlayTime | null => {
    const inp: string | null = prompt("ジャンプ先の時間を入力してください。\nh:mm:ss または mm:ss の形式で入力してください。");
    
    return if_not_null(inp, (inpstr) => {
        return if_null(PlayTime.try_from_string(inpstr), () => {
            alert("Error: 正しくない形式で入力されている可能性があります。");
        });
    });
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
    
    
    const vc = new VideoController(video, lesson_id);
    
    vc.fastplay_speed = 10.0;
    vc.cycle_interval_secs = 10;
    vc.cookie_age_days = 30;
    vc.judge_rewind = (bpt): boolean => {
        return confirm(`長時間の前方向のジャンプを検出しました。\n${bpt.fmt()} に戻りますか？`);
    }
    
    const saved_playtime = vc.load_cookie();
    if_not_null(saved_playtime, (saved_pt) => {
        const result = confirm(`${saved_pt.fmt()} から再開しますか？`);
        if (result) vc.absolute_jump(saved_pt);
    });
    
    const keymap = new Keymap(
        [ new Key("Space"),        () => vc.play_toggle(),          null ],
        [ new Key("ArrowLeft"),    () => vc.relative_jump(-5),      null ],
        [ new Key("ArrowRight"),   () => vc.relative_jump(5),       null ],
        [ new Key("Comma", true),  () => vc.speed_slower(0.2, 0.8), null ],
        [ new Key("Period", true), () => vc.speed_faster(0.2, 2.0), null ],
        [ new Key("KeyJ"), () => { if_not_null(input_playtime(), (pt) => vc.absolute_jump(pt)); }, null ]
        
        // !test-start: fastplay
        ,[ new Key("KeyM"), () => vc.fastplay_on(), () => vc.fastplay_off() ],
        // !test-end: fastplay
    );
    
    keymap.create_listener();
    
    vc.create_save_cycle();
    
    return true
};
