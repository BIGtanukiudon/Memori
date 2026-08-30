//! 作業ログCLI用: ローカル日付 → UTC半開区間の変換 (PRD §5)。
//!
//! 作業ログは UTC (`created_at`) で保存されるが、日報の「今日」はローカル日付。
//! UTC文字列の前方一致で絞り込むと JST 00:00〜09:00 の記録が前日扱いになるため、
//! 必ずこの変換を経由すること。

use chrono::{Duration, FixedOffset, Local, NaiveDate, SecondsFormat, TimeZone, Utc};

fn parse_ymd(s: &str) -> Result<NaiveDate, String> {
    let parts: Vec<&str> = s.split('-').collect();
    let [y_s, m_s, d_s] = parts[..] else {
        return Err(format!("日付の形式が不正です（YYYY-MM-DD）: {s}"));
    };
    if y_s.len() != 4 || m_s.len() != 2 || d_s.len() != 2 {
        return Err(format!("日付の形式が不正です（YYYY-MM-DD）: {s}"));
    }
    if ![y_s, m_s, d_s]
        .iter()
        .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
    {
        return Err(format!("日付の形式が不正です（YYYY-MM-DD）: {s}"));
    }

    let y: i32 = y_s.parse().map_err(|_| format!("日付の形式が不正です: {s}"))?;
    let m: u32 = m_s.parse().map_err(|_| format!("日付の形式が不正です: {s}"))?;
    let d: u32 = d_s.parse().map_err(|_| format!("日付の形式が不正です: {s}"))?;

    NaiveDate::from_ymd_opt(y, m, d).ok_or_else(|| format!("存在しない日付です: {s}"))
}

/// ローカル日付 from..=to を UTC の半開区間 [start, end) に変換する。
/// 返り値は既存 now_iso() と同じ RFC3339 / ミリ秒 / UTC 表記。
pub fn local_date_range_to_utc(from: &str, to: &str) -> Result<(String, String), String> {
    let offset = *Local::now().offset();
    date_range_to_utc_with_offset(from, to, offset)
}

/// [`local_date_range_to_utc`] の本体。オフセットを注入できるためテスト可能。
/// `Local` を直接参照すると実行環境のTZに左右されテストが書けないので分離している。
fn date_range_to_utc_with_offset(
    from: &str,
    to: &str,
    offset: FixedOffset,
) -> Result<(String, String), String> {
    let from_date = parse_ymd(from)?;
    let to_date = parse_ymd(to)?;
    if from_date > to_date {
        return Err(format!("fromはto以前の日付にしてください: {from} > {to}"));
    }

    let start_naive = from_date.and_hms_opt(0, 0, 0).expect("00:00:00は常に有効");
    let end_naive = (to_date + Duration::days(1))
        .and_hms_opt(0, 0, 0)
        .expect("00:00:00は常に有効");

    // FixedOffsetは常に一意に解決される(夏時間のようなギャップ/重複が無い)。
    let start_utc = offset
        .from_local_datetime(&start_naive)
        .single()
        .expect("FixedOffsetは常に一意")
        .with_timezone(&Utc);
    let end_utc = offset
        .from_local_datetime(&end_naive)
        .single()
        .expect("FixedOffsetは常に一意")
        .with_timezone(&Utc);

    Ok((
        start_utc.to_rfc3339_opts(SecondsFormat::Millis, true),
        end_utc.to_rfc3339_opts(SecondsFormat::Millis, true),
    ))
}

/// 「今日」をローカル日付(YYYY-MM-DD)で返す。
pub fn today_local() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn jst() -> FixedOffset {
        FixedOffset::east_opt(9 * 3600).unwrap()
    }

    #[test]
    fn single_day_jst_converts_to_utc_half_open_range() {
        let (start, end) =
            date_range_to_utc_with_offset("2026-08-30", "2026-08-30", jst()).unwrap();
        assert_eq!(start, "2026-08-29T15:00:00.000Z");
        assert_eq!(end, "2026-08-30T15:00:00.000Z");
    }

    #[test]
    fn multi_day_range_jst() {
        let (start, end) =
            date_range_to_utc_with_offset("2026-08-25", "2026-08-30", jst()).unwrap();
        assert_eq!(start, "2026-08-24T15:00:00.000Z");
        assert_eq!(end, "2026-08-30T15:00:00.000Z");
    }

    #[test]
    fn year_boundary_jst() {
        let (start, end) =
            date_range_to_utc_with_offset("2026-12-31", "2026-12-31", jst()).unwrap();
        assert_eq!(start, "2026-12-30T15:00:00.000Z");
        assert_eq!(end, "2026-12-31T15:00:00.000Z");
    }

    #[test]
    fn leap_day_jst() {
        let (start, end) =
            date_range_to_utc_with_offset("2028-02-29", "2028-02-29", jst()).unwrap();
        assert_eq!(start, "2028-02-28T15:00:00.000Z");
        assert_eq!(end, "2028-02-29T15:00:00.000Z");
    }

    #[test]
    fn utc_offset_zero_is_pass_through() {
        let (start, end) = date_range_to_utc_with_offset(
            "2026-08-30",
            "2026-08-30",
            FixedOffset::east_opt(0).unwrap(),
        )
        .unwrap();
        assert_eq!(start, "2026-08-30T00:00:00.000Z");
        assert_eq!(end, "2026-08-31T00:00:00.000Z");
    }

    #[test]
    fn single_digit_month_is_error() {
        assert!(date_range_to_utc_with_offset("2026-8-30", "2026-8-30", jst()).is_err());
    }

    #[test]
    fn invalid_month_is_error() {
        assert!(date_range_to_utc_with_offset("2026-13-01", "2026-13-01", jst()).is_err());
    }

    #[test]
    fn invalid_day_is_error() {
        assert!(date_range_to_utc_with_offset("2026-02-30", "2026-02-30", jst()).is_err());
    }

    #[test]
    fn from_after_to_is_error() {
        let err =
            date_range_to_utc_with_offset("2026-08-30", "2026-08-01", jst()).unwrap_err();
        assert!(err.contains("2026-08-30"));
    }

    #[test]
    fn today_local_returns_yyyy_mm_dd_format() {
        let s = today_local();
        let parts: Vec<&str> = s.split('-').collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0].len(), 4);
        assert_eq!(parts[1].len(), 2);
        assert_eq!(parts[2].len(), 2);
    }
}
