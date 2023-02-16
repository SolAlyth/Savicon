export const if_null = (value, func) => { const f = () => { func(); return null; }; return (value !== null) ? value : f(); }; export const if_not_null = (value, func) => { return (value !== null) ? func(value) : null; }; class Option { value; constructor(value) { this.value = value; } static from_undef(value) { return new Option(value); } static some(value) { return new Option(value); } static none() { return new Option(); } is_some() { return this.value !== undefined; } is_none() { return this.value === undefined; } unwrap() { return this.value; } optmatch(func) { return (this.value !== undefined) ? func.some(this.value) : func.none(); } if_all_some(opts, func) { return (opts.every(opt => opt.is_some())) ? func.all(...opts.map(opt => opt.unwrap())) : func.other(); } } export class PlayTime { h; m; s; constructor(h, m, s) { this.h = h; this.m = m; this.s = s; } toString() { return `PlayTime(${this.fmt()})`; } fmt() { return (this.h === 0) ? `${this.m}:${(this.s).toString().padStart(2, "0")}` : `${this.h}:${(this.m).toString().padStart(2, "0")}:${(this.s).toString().padStart(2, "0")}`; } distance(other) { return other.to_secs() - this.to_secs(); } to_secs() { return 3600 * this.h + 60 * this.m + this.s; } add(time) { return PlayTime.from_secs(this.to_secs() + time); } static from_secs(from) { const sec = Math.max(Math.floor(from), 0); const s = sec % 60, m = (sec - s) / 60 % 60, h = (sec - 60 * m - s) / 3600; return new PlayTime(h, m, s); } static try_from_string(from) { const time_match_result = from.match(/^(([1-9]):)?([0-5]?[0-9]):([0-5]?[0-9])$/); return if_not_null(time_match_result, (timearr) => new PlayTime(Number(timearr[2] ?? 0), Number(timearr[3]), Number(timearr[4]))); } } export class Key { code; shift; constructor(code, shift) { this.code = code; this.shift = Option.from_undef(shift); } toString() { return this.shift.optmatch({ some: (sft) => `Key(${this.code}, shift=${sft})`, none: () => `Key(${this.code})` }); } static from_KeyboardEvent(e) { return new Key(e.code, e.shiftKey); } eq(other) { if (this.code !== other.code) return false; return this.shift.if_all_some([this.shift, other.shift], { all: (thisshift, othershift) => thisshift === othershift, other: () => true }); } } export class Keymap { keymap; listen_func = undefined; constructor(...keymaps) { this.keymap = keymaps; } has(key) { return this.keymap.find(keycfg => keycfg[0].eq(key)) ?? null; } create_listener() { if (this.listen_func !== undefined) return false; this.listen_func = { keydown: (e) => { const inpkey = Key.from_KeyboardEvent(e); const keycfg = this.has(inpkey); if (keycfg !== null && keycfg[1] !== null) { console.log(`Keydown: ${inpkey}`); keycfg[1](); } }, keyup: (e) => { const inpkey = Key.from_KeyboardEvent(e); const keycfg = this.has(inpkey); if (keycfg !== null && keycfg[2] !== null) { console.log(`Keyup: ${inpkey}`); keycfg[2](); } } }; document.addEventListener("keydown", this.listen_func.keydown); document.addEventListener("keyup", this.listen_func.keyup); return true; } delete_listener() { if (this.listen_func === undefined) return false; document.removeEventListener("keydown", this.listen_func.keydown); document.removeEventListener("keyup", this.listen_func.keyup); this.listen_func = undefined; return true; } } export const is_running = (window) => { return typeof window.savicon_running_flag !== "undefined"; }; export const running = (window) => { window.savicon_running_flag = true; }; export const get_video_element = (index) => { return document.getElementsByTagName("video")[index] ?? null; }; export class VideoController { video; id; fastplay_speed = 2.0; fastplay_flag = false; fastplay_before_speed = 0; cycle_interval_secs = 60; cycle_id = Option.none(); cookie_age_days = 1; judge_rewind = () => false; before_playtime = undefined; rewind_min_secs = 300; get speed() { return this.video.playbackRate; } set speed(spd) { this.video.playbackRate = spd; } get playtime() { return PlayTime.from_secs(this.video.currentTime); } set playtime(pt) { this.video.currentTime = pt.to_secs(); } constructor(video, id) { this.video = video; this.id = id; } play() { if (this.video.readyState >= this.video.HAVE_FUTURE_DATA) this.video.play(); this.video.play().then(() => { }, (err) => { if (err.message !== "The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22") throw err; console.log(`debug: DOMException was ignored in lib/play (https://github.com/SolAlyth/Savicon/issues/1)`); }); } pause() { this.video.pause(); } play_toggle() { if (this.video.paused) this.play(); else this.pause(); } absolute_jump(pt) { this.playtime = pt; console.log(`jump: ${pt.fmt()}`); } relative_jump(time) { this.absolute_jump(this.playtime.add(time)); } speed_faster(interval, max) { if (this.speed <= max - interval) this.speed += interval; } speed_slower(interval, min) { if (min + interval <= this.speed) this.speed -= interval; } fastplay_on() { if (this.fastplay_flag) return false; this.fastplay_before_speed = this.speed; this.speed = this.fastplay_speed; this.fastplay_flag = true; return true; } fastplay_off() { if (!this.fastplay_flag) return false; this.speed = this.fastplay_before_speed; this.fastplay_flag = false; return true; } load_cookie() { const ptl = document.cookie.split("; ").flatMap((cookie) => { const result = cookie.match(`^${this.id}=([0-9]+)$`); return (result !== null) ? [PlayTime.from_secs(Number(result[1]))] : []; }); return ptl[0] ?? null; } save_cookie() { document.cookie = `${this.id}=${this.playtime.to_secs()}; Max-age=${86400 * this.cookie_age_days}`; console.log(`Save: ${this.playtime.fmt()}`); } check_rewind() { const pt = this.playtime, bpt = this.before_playtime; if (pt === null || bpt === undefined) return; if (pt.to_secs() < this.cycle_interval_secs && bpt.distance(pt) < -this.rewind_min_secs) { if (this.judge_rewind(bpt)) this.absolute_jump(bpt); } } create_save_cycle() { if (this.cycle_id.is_some()) return false; const func = () => { this.save_cookie(); this.check_rewind(); }; const interval_id = window.setInterval(func, 1000 * this.cycle_interval_secs); this.cycle_id = Option.some(interval_id); return true; } delete_save_cycle() { return this.cycle_id.optmatch({ some: (cycle_id) => { clearInterval(cycle_id); this.cycle_id = Option.none(); return true; }, none: () => false }); } }