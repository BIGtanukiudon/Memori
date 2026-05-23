// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Step 9 / spec §7: `app.exe task ...` ならGUIを起動せずCLIを実行して終了。
    let argv: Vec<String> = std::env::args().collect();
    if let Some(code) = memori_lib::cli::try_dispatch(&argv) {
        std::process::exit(code);
    }
    memori_lib::run()
}
