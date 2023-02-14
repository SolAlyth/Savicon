const COOKIE_AGE_DAYS = 1, REWIND_DETECT_MIN_SECS = 30, REWIND_DETECT_DISTANCE_SECS = 600, INTERVAL_DELAY_SECS = 10; const if_not_null = (value, func) => { return (value !== null) ? func(value) : null; }; class Option { value; constructor(value) { this.value = value; } static from_undef(value) { return new Option(value); } static some(value) { return new Option(value); } static none() { return new Option(); } is_some() { return this.value !== undefined; } is_none() { return this.value === undefined; } unwrap() { return this.value; } } export class PlayTime { h; m; s; constructor(h, m, s) { this.h = h; this.m = m; this.s = s; } toString() { return `PlayTime(${this.fmt()})`; } fmt() { return (this.h === 0) ? `${this.m}:${(this.s).toString().padStart(2, "0")}` : `${this.h}:${(this.m).toString().padStart(2, "0")}:${(this.s).toString().padStart(2, "0")}`; } distance(other) { return other.to_secs() - this.to_secs(); } to_secs() { return 3600 * this.h + 60 * this.m + this.s; } static from_secs(from) { const s = from % 60, m = (from - s) / 60 % 60, h = (from - 60 * m - s) / 3600; return new PlayTime(h, m, s); } static try_from_string(from) { const time = from.match(/(([1-9]):)?([0-5]?[0-9]):([0-5]?[0-9])/); if (time === null) { return null; } return new PlayTime(Number(time[2] ?? 0), Number(time[3]), Number(time[4])); } } export class Key { code; shift; constructor(code, shift) { this.code = code; this.shift = Option.from_undef(shift); } static from_keyboardevent(e) { return new Key(e.code, e.shiftKey); } eq(other) { if (this.code !== other.code) return false; if (this.shift.is_none() || other.shift.is_none()) return true; return this.shift.unwrap() === other.shift.unwrap(); } } export class Keymap { keymap; listen_func; constructor(...keymaps) { this.keymap = keymaps; this.listen_func = undefined; } has(key) { return this.keymap.find(keycfg => keycfg[0].eq(key)) ?? null; } create_listener() { if (this.listen_func !== undefined) { return false; } this.listen_func = { keydown: (e) => { const inpkey = Key.from_keyboardevent(e); const keycfg = this.has(inpkey); if (keycfg !== null && keycfg[1] !== null) { keycfg[1](); console.log(`Keydown: ${inpkey.code}`); } }, keyup: (e) => { const inpkey = Key.from_keyboardevent(e); const keycfg = this.has(inpkey); if (keycfg !== null && keycfg[2] !== null) { keycfg[2](); console.log(`Keyup: ${inpkey.code}`); } } }; document.addEventListener("keydown", this.listen_func.keydown); document.addEventListener("keyup", this.listen_func.keyup); return true; } delete_listener() { if (this.listen_func === undefined) { return false; } document.removeEventListener("keydown", this.listen_func.keydown); document.removeEventListener("keyup", this.listen_func.keyup); this.listen_func = undefined; return true; } } export const is_running = (window) => { return typeof window.savicon_running_flag !== "undefined"; }; export const running = (window) => { window.savicon_running_flag = true; }; export const get_video_element = (index) => { return document.getElementsByTagName("video")[index] ?? null; }; const play = (video) => { if (video.readyState >= video.HAVE_FUTURE_DATA) video.play(); video.play().then(() => { }, (err) => { if (err.message !== "The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22") throw err; console.log(`debug: DOMException is ignored in lib/play (https://github.com/SolAlyth/Savicon/issues/1)`); }); }; export const play_toggle = (video) => { if (video.paused) play(video); else video.pause(); }; export const absolute_jump = (video, playtime) => { video.currentTime = playtime.to_secs(); }; export const relative_jump = (video, time) => { video.currentTime += time; }; export const get_speed = (video) => { return video.playbackRate; }; export const set_speed = (video, speed) => { video.playbackRate = speed; }; export const speed_faster = (video, interval, max) => { if (video.playbackRate <= max - interval) video.playbackRate += interval; }; export const speed_slower = (video, interval, min) => { if (min + interval <= video.playbackRate) video.playbackRate -= interval; }; const save_playtime = (video, id, rewind_confirm) => { const video_playtime = PlayTime.from_secs(Math.floor(video.currentTime)); const before_playtime = load_playtime(id); if (before_playtime !== null && video_playtime.to_secs() < REWIND_DETECT_MIN_SECS && video_playtime.distance(before_playtime) > REWIND_DETECT_DISTANCE_SECS) { delete_save_cycle(id); const rewind = rewind_confirm(before_playtime); create_save_cycle(video, id, rewind_confirm); if (rewind) { absolute_jump(video, before_playtime); return; } } document.cookie = `${id}=${video_playtime.to_secs()}; Max-age=${86400 * COOKIE_AGE_DAYS}`; console.log(`Save: ${video_playtime}`); }; let save_interval_id_map = new Map(); export const create_save_cycle = (video, id, rewind_confirm) => { if (save_interval_id_map.has(id)) return false; const interval_id = window.setInterval(() => save_playtime(video, id, rewind_confirm), 1000 * INTERVAL_DELAY_SECS); save_interval_id_map.set(id, interval_id); return true; }; export const delete_save_cycle = (id) => { const interval_id = save_interval_id_map.get(id); if (interval_id === undefined) return false; clearInterval(interval_id); save_interval_id_map.delete(id); return true; }; const load_playtime = (id) => { const match_result = (document.cookie).match(`${id}=([0-9]+)`); return if_not_null(match_result, (matcharr) => PlayTime.from_secs(Number(matcharr[1]))); }; export const jump_saved_time = (video, id, confirm) => { const playtime = load_playtime(id); if (playtime === null || !confirm(playtime)) return false; absolute_jump(video, playtime); return true; };