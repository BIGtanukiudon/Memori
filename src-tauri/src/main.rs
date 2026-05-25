// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
fn attach_parent_console() {
    extern "system" {
        fn AttachConsole(dw_process_id: u32) -> i32;
    }
    const ATTACH_PARENT_PROCESS: u32 = 0xFFFF_FFFF;
    unsafe {
        AttachConsole(ATTACH_PARENT_PROCESS);
    }
}

fn main() {
    let argv: Vec<String> = std::env::args().collect();

    // windows_subsystem = "windows" のリリースビルドではコンソールが無いため、
    // CLIモード時は親プロセス（cmd.exe / PowerShell）のコンソールにアタッチする。
    #[cfg(windows)]
    if memori_lib::cli::args::is_cli_argv(&argv) {
        attach_parent_console();
    }

    if let Some(code) = memori_lib::cli::try_dispatch(&argv) {
        std::process::exit(code);
    }
    memori_lib::run()
}
