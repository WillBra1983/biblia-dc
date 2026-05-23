import sqlite3


def main() -> None:
    conn = sqlite3.connect("c:/Salvation/public/ot_strong.sqlite")
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT entry_id FROM bdb_entries WHERE entry_id LIKE ? ORDER BY entry_id LIMIT 200",
        ("v%",),
    ).fetchall()
    print("total_amostra:", len(rows))
    for (entry_id,) in rows:
        print(entry_id)


if __name__ == "__main__":
    main()
