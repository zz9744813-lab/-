#!/usr/bin/env python3
from __future__ import annotations

from datetime import date, datetime

import streamlit as st

from growth_system import get_conn, init_db


st.set_page_config(page_title="个人成长管理系统", page_icon="📈", layout="wide")


def ensure_db() -> None:
    init_db()


def render_goals() -> None:
    st.subheader("🎯 目标列表")

    with st.form("add_goal_form", clear_on_submit=True):
        title = st.text_input("目标标题", placeholder="例如：3个月读完12本书")
        category = st.text_input("分类", value="通用")
        target_date = st.date_input("截止日期", value=None)
        submitted = st.form_submit_button("新增目标")

        if submitted:
            if not title.strip():
                st.warning("目标标题不能为空")
            else:
                with get_conn() as conn:
                    conn.execute(
                        "INSERT INTO goals (title, category, target_date, created_at) VALUES (?, ?, ?, ?)",
                        (
                            title.strip(),
                            category.strip() or "通用",
                            target_date.isoformat() if target_date else None,
                            datetime.utcnow().isoformat(timespec="seconds"),
                        ),
                    )
                st.success("目标已新增")

    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM goals ORDER BY id DESC").fetchall()

    if not rows:
        st.info("暂无目标")
        return

    st.dataframe(
        [
            {
                "ID": r["id"],
                "标题": r["title"],
                "分类": r["category"],
                "截止日期": r["target_date"] or "-",
                "状态": r["status"],
                "创建时间": r["created_at"],
            }
            for r in rows
        ],
        use_container_width=True,
        hide_index=True,
    )


def render_habits() -> None:
    st.subheader("🏃 习惯列表")

    with get_conn() as conn:
        goals = conn.execute("SELECT id, title FROM goals WHERE status='active' ORDER BY id DESC").fetchall()

    goal_options = {f"{g['id']} - {g['title']}": g["id"] for g in goals}

    with st.form("add_habit_form", clear_on_submit=True):
        name = st.text_input("习惯名称", placeholder="例如：晨跑30分钟")
        frequency = st.selectbox("频率", ["daily", "weekly"], index=0)
        start_date = st.date_input("开始日期", value=date.today())
        selected_goal = st.selectbox("关联目标（可选）", ["不关联"] + list(goal_options.keys()))
        submitted = st.form_submit_button("新增习惯")

        if submitted:
            if not name.strip():
                st.warning("习惯名称不能为空")
            else:
                goal_id = goal_options[selected_goal] if selected_goal != "不关联" else None
                with get_conn() as conn:
                    conn.execute(
                        "INSERT INTO habits (name, frequency, start_date, goal_id) VALUES (?, ?, ?, ?)",
                        (name.strip(), frequency, start_date.isoformat(), goal_id),
                    )
                st.success("习惯已新增")

    with get_conn() as conn:
        habits = conn.execute(
            """
            SELECT h.id, h.name, h.frequency, h.start_date, h.goal_id, g.title as goal_title
            FROM habits h
            LEFT JOIN goals g ON h.goal_id = g.id
            ORDER BY h.id DESC
            """
        ).fetchall()

    if not habits:
        st.info("暂无习惯")
        return

    st.dataframe(
        [
            {
                "ID": h["id"],
                "习惯": h["name"],
                "频率": h["frequency"],
                "开始日期": h["start_date"],
                "关联目标": h["goal_title"] or "-",
            }
            for h in habits
        ],
        use_container_width=True,
        hide_index=True,
    )


def render_checkin_and_journal() -> None:
    st.subheader("✅ 今日打卡")

    today = date.today().isoformat()

    with get_conn() as conn:
        habits = conn.execute("SELECT id, name FROM habits ORDER BY id DESC").fetchall()

    if habits:
        habit_options = {f"{h['id']} - {h['name']}": h["id"] for h in habits}
        with st.form("checkin_form", clear_on_submit=True):
            selected_habit = st.selectbox("选择习惯", list(habit_options.keys()))
            note = st.text_input("备注", placeholder="例如：今天状态很好")
            submitted = st.form_submit_button("记录今日打卡")

            if submitted:
                habit_id = habit_options[selected_habit]
                with get_conn() as conn:
                    conn.execute(
                        "INSERT OR REPLACE INTO habit_checkins (habit_id, checkin_date, note) VALUES (?, ?, ?)",
                        (habit_id, today, note.strip() or None),
                    )
                st.success("今日打卡已记录")
    else:
        st.info("请先新增习惯，再进行打卡。")

    with get_conn() as conn:
        today_rows = conn.execute(
            """
            SELECT hc.checkin_date, hc.note, h.name
            FROM habit_checkins hc
            JOIN habits h ON hc.habit_id = h.id
            WHERE hc.checkin_date = ?
            ORDER BY hc.id DESC
            """,
            (today,),
        ).fetchall()

    if today_rows:
        st.write(f"**{today} 已打卡记录**")
        st.dataframe(
            [{"习惯": r["name"], "日期": r["checkin_date"], "备注": r["note"] or "-"} for r in today_rows],
            use_container_width=True,
            hide_index=True,
        )

    st.subheader("📝 日记记录")
    with st.form("journal_form", clear_on_submit=True):
        journal_date = st.date_input("日期", value=date.today())
        mood = st.slider("心情评分", min_value=1, max_value=5, value=4)
        wins = st.text_area("今天做得好的地方")
        lessons = st.text_area("今天的教训")
        next_actions = st.text_area("下一步行动")
        submitted = st.form_submit_button("保存日记")

        if submitted:
            with get_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO journals (journal_date, mood, wins, lessons, next_actions, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        journal_date.isoformat(),
                        mood,
                        wins.strip() or None,
                        lessons.strip() or None,
                        next_actions.strip() or None,
                        datetime.utcnow().isoformat(timespec="seconds"),
                    ),
                )
            st.success("日记已保存")


def render_dashboard() -> None:
    st.subheader("📊 Dashboard 汇总")

    today = date.today().isoformat()

    with get_conn() as conn:
        total_goals = conn.execute("SELECT COUNT(*) FROM goals").fetchone()[0]
        active_goals = conn.execute("SELECT COUNT(*) FROM goals WHERE status='active'").fetchone()[0]
        total_habits = conn.execute("SELECT COUNT(*) FROM habits").fetchone()[0]
        today_checkins = conn.execute("SELECT COUNT(*) FROM habit_checkins WHERE checkin_date=?", (today,)).fetchone()[0]
        week_checkins = conn.execute(
            "SELECT COUNT(*) FROM habit_checkins WHERE checkin_date >= date('now','-6 day')"
        ).fetchone()[0]
        latest_journal = conn.execute(
            "SELECT journal_date, mood, wins, lessons, next_actions FROM journals ORDER BY journal_date DESC, id DESC LIMIT 1"
        ).fetchone()

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("目标总数", total_goals)
    c2.metric("进行中目标", active_goals)
    c3.metric("习惯总数", total_habits)
    c4.metric("今日打卡", today_checkins)

    st.metric("最近7天打卡总数", week_checkins)

    st.markdown("### 最新复盘")
    if latest_journal:
        st.write(f"日期：{latest_journal['journal_date']}")
        st.write(f"心情：{latest_journal['mood']}")
        st.write(f"亮点：{latest_journal['wins'] or '-'}")
        st.write(f"教训：{latest_journal['lessons'] or '-'}")
        st.write(f"下一步：{latest_journal['next_actions'] or '-'}")
    else:
        st.info("暂无复盘记录")


def main() -> None:
    ensure_db()

    st.title("个人成长管理系统")
    st.caption("保留 CLI + SQLite 结构，新增可视化 Web 界面（Streamlit）")

    tab1, tab2, tab3, tab4 = st.tabs(["目标", "习惯", "打卡&日记", "Dashboard"])

    with tab1:
        render_goals()

    with tab2:
        render_habits()

    with tab3:
        render_checkin_and_journal()

    with tab4:
        render_dashboard()


if __name__ == "__main__":
    main()
