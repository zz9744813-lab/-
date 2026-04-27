#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sqlite3
from contextlib import closing
from datetime import date, datetime
from pathlib import Path

DB_PATH = Path("growth.db")


def get_conn(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DB_PATH) -> None:
    with closing(get_conn(db_path)) as conn, conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                target_date TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                frequency TEXT NOT NULL,
                start_date TEXT NOT NULL,
                goal_id INTEGER,
                FOREIGN KEY(goal_id) REFERENCES goals(id)
            );

            CREATE TABLE IF NOT EXISTS habit_checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                habit_id INTEGER NOT NULL,
                checkin_date TEXT NOT NULL,
                note TEXT,
                UNIQUE(habit_id, checkin_date),
                FOREIGN KEY(habit_id) REFERENCES habits(id)
            );

            CREATE TABLE IF NOT EXISTS journals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                journal_date TEXT NOT NULL,
                mood INTEGER,
                wins TEXT,
                lessons TEXT,
                next_actions TEXT,
                created_at TEXT NOT NULL
            );
            """
        )


def add_goal(args: argparse.Namespace) -> None:
    created_at = datetime.utcnow().isoformat(timespec="seconds")
    with closing(get_conn()) as conn, conn:
        conn.execute(
            "INSERT INTO goals (title, category, target_date, created_at) VALUES (?, ?, ?, ?)",
            (args.title, args.category, args.target_date, created_at),
        )
    print(f"✅ 已创建目标: {args.title}")


def add_habit(args: argparse.Namespace) -> None:
    with closing(get_conn()) as conn, conn:
        conn.execute(
            "INSERT INTO habits (name, frequency, start_date, goal_id) VALUES (?, ?, ?, ?)",
            (args.name, args.frequency, args.start_date or str(date.today()), args.goal_id),
        )
    print(f"✅ 已创建习惯: {args.name}")


def checkin(args: argparse.Namespace) -> None:
    checkin_date = args.date or str(date.today())
    with closing(get_conn()) as conn, conn:
        conn.execute(
            "INSERT OR REPLACE INTO habit_checkins (habit_id, checkin_date, note) VALUES (?, ?, ?)",
            (args.habit_id, checkin_date, args.note),
        )
    print(f"✅ 打卡成功: 习惯ID={args.habit_id}, 日期={checkin_date}")


def add_journal(args: argparse.Namespace) -> None:
    created_at = datetime.utcnow().isoformat(timespec="seconds")
    journal_date = args.date or str(date.today())
    with closing(get_conn()) as conn, conn:
        conn.execute(
            """
            INSERT INTO journals (journal_date, mood, wins, lessons, next_actions, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (journal_date, args.mood, args.wins, args.lessons, args.next_actions, created_at),
        )
    print(f"✅ 已写复盘: 日期={journal_date}")


def list_goals(_: argparse.Namespace) -> None:
    with closing(get_conn()) as conn:
        rows = conn.execute("SELECT * FROM goals ORDER BY id DESC").fetchall()
    if not rows:
        print("暂无目标。")
        return
    for r in rows:
        print(f"[{r['id']}] {r['title']} | {r['category']} | 截止: {r['target_date'] or '-'} | 状态: {r['status']}")


def dashboard(_: argparse.Namespace) -> None:
    today = str(date.today())
    with closing(get_conn()) as conn:
        total_goals = conn.execute("SELECT COUNT(*) FROM goals").fetchone()[0]
        active_goals = conn.execute("SELECT COUNT(*) FROM goals WHERE status='active'").fetchone()[0]
        total_habits = conn.execute("SELECT COUNT(*) FROM habits").fetchone()[0]
        today_checkins = conn.execute(
            "SELECT COUNT(*) FROM habit_checkins WHERE checkin_date=?", (today,)
        ).fetchone()[0]
        week_checkins = conn.execute(
            """
            SELECT COUNT(*)
            FROM habit_checkins
            WHERE checkin_date >= date('now', '-6 day')
            """
        ).fetchone()[0]
        latest_journal = conn.execute(
            "SELECT journal_date, mood, wins FROM journals ORDER BY journal_date DESC, id DESC LIMIT 1"
        ).fetchone()

    print("\n📈 个人成长仪表盘")
    print("-" * 36)
    print(f"目标总数: {total_goals}（进行中: {active_goals}）")
    print(f"习惯总数: {total_habits}")
    print(f"今日打卡数 ({today}): {today_checkins}")
    print(f"最近7天打卡总数: {week_checkins}")
    if latest_journal:
        print(f"最新复盘: {latest_journal['journal_date']} | 心情: {latest_journal['mood'] or '-'}")
        print(f"复盘亮点: {latest_journal['wins'] or '-'}")
    else:
        print("最新复盘: 暂无")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="个人成长管理系统（CLI）")
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="初始化数据库")
    p_init.set_defaults(func=lambda _: (init_db(), print("✅ 初始化完成: growth.db")))

    p_goal = sub.add_parser("add-goal", help="新增目标")
    p_goal.add_argument("title", help="目标标题")
    p_goal.add_argument("--category", default="通用", help="目标分类")
    p_goal.add_argument("--target-date", help="截止日期，例如 2026-12-31")
    p_goal.set_defaults(func=add_goal)

    p_list = sub.add_parser("list-goals", help="查看目标")
    p_list.set_defaults(func=list_goals)

    p_habit = sub.add_parser("add-habit", help="新增习惯")
    p_habit.add_argument("name", help="习惯名称")
    p_habit.add_argument("--frequency", default="daily", choices=["daily", "weekly"], help="频率")
    p_habit.add_argument("--start-date", help="开始日期，例如 2026-04-26")
    p_habit.add_argument("--goal-id", type=int, help="关联目标ID")
    p_habit.set_defaults(func=add_habit)

    p_checkin = sub.add_parser("checkin", help="习惯打卡")
    p_checkin.add_argument("habit_id", type=int, help="习惯ID")
    p_checkin.add_argument("--date", help="打卡日期，例如 2026-04-26")
    p_checkin.add_argument("--note", help="打卡备注")
    p_checkin.set_defaults(func=checkin)

    p_journal = sub.add_parser("journal", help="每日复盘")
    p_journal.add_argument("--date", help="复盘日期")
    p_journal.add_argument("--mood", type=int, choices=[1, 2, 3, 4, 5], help="心情评分(1-5)")
    p_journal.add_argument("--wins", help="今天做得好的地方")
    p_journal.add_argument("--lessons", help="今天的教训")
    p_journal.add_argument("--next-actions", help="下一步行动")
    p_journal.set_defaults(func=add_journal)

    p_dashboard = sub.add_parser("dashboard", help="查看成长仪表盘")
    p_dashboard.set_defaults(func=dashboard)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command != "init" and not DB_PATH.exists():
        init_db()
    args.func(args)


if __name__ == "__main__":
    main()
