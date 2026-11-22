"""
Tower of Hanoi — Leaderboard API Server
Flask + MySQL backend storing top 100 scores per disk count.
Uses UUID-based user identification — display names are NOT unique.
"""

import uuid
import re
import mysql.connector
from mysql.connector import pooling
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
password = os.getenv("DS_password")

app = Flask(__name__)
CORS(app)

MAX_ENTRIES = 100
UUID_REGEX = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)

# --- MySQL Connection Pool ---
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': password ,          # ← set your MySQL password here
    'database': 'tower_of_hanoi',
    'autocommit': False,
}

pool = None


def get_db():
    global pool
    if pool is None:
        pool = pooling.MySQLConnectionPool(
            pool_name="hanoi_pool",
            pool_size=5,
            **DB_CONFIG
        )
    conn = pool.get_connection()
    return conn


def init_db():
    """Create the database and table if they don't exist."""
    setup_conn = mysql.connector.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password']
    )
    cursor = setup_conn.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS tower_of_hanoi")
    cursor.close()
    setup_conn.close()

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id CHAR(36) NOT NULL,
            name VARCHAR(30) NOT NULL,
            country VARCHAR(5) NOT NULL,
            moves INT NOT NULL,
            time_seconds INT NOT NULL,
            num_disks INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_disks (user_id, num_disks),
            INDEX idx_disks_time (num_disks, time_seconds ASC, moves ASC)
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()


def validate_uuid(uid):
    """Validate that the string is a proper UUID v4."""
    return bool(uid and UUID_REGEX.match(uid))


def get_rank(cursor, num_disks, time_seconds, moves):
    """Get the rank a score would achieve (1-indexed)."""
    cursor.execute('''
        SELECT COUNT(*) as cnt FROM leaderboard
        WHERE num_disks = %s
        AND (time_seconds < %s OR (time_seconds = %s AND moves < %s))
    ''', (num_disks, time_seconds, time_seconds, moves))
    # result = cursor.fetchone()
    # # Handle both tuple and dict return types
    # count = result['cnt'] if isinstance(result, dict) else result[0]
    # return count + 1
    return cursor.fetchone()[0] + 1


def trim_leaderboard(cursor, num_disks):
    """Keep only the top MAX_ENTRIES scores for a given disk count."""
    cursor.execute('''
        DELETE l FROM leaderboard l
        LEFT JOIN (
            SELECT id FROM leaderboard
            WHERE num_disks = %s
            ORDER BY time_seconds ASC, moves ASC
            LIMIT %s
        ) AS top ON l.id = top.id
        WHERE l.num_disks = %s AND top.id IS NULL
    ''', (num_disks, MAX_ENTRIES, num_disks))


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    num_disks = request.args.get('disks', 4, type=int)
    if num_disks < 3 or num_disks > 9:
        return jsonify({'error': 'disks must be 3-9'}), 400

    # Optional: highlight the requesting user's entry
    user_id = request.args.get('user_id', '')

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT user_id, name, country, moves, time_seconds
        FROM leaderboard
        WHERE num_disks = %s
        ORDER BY time_seconds ASC, moves ASC
        LIMIT %s
    ''', (num_disks, MAX_ENTRIES))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    results = []
    for i, row in enumerate(rows):
        results.append({
            'rank': i + 1,
            'name': row['name'],
            'country': row['country'],
            'moves': row['moves'],
            'time': row['time_seconds'],
            'is_you': row['user_id'] == user_id if user_id else False,
        })
    return jsonify(results)


@app.route('/api/check-rank', methods=['GET'])
def check_rank():
    num_disks = request.args.get('disks', 4, type=int)
    time_seconds = request.args.get('time', 0, type=int)
    moves = request.args.get('moves', 0, type=int)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM leaderboard WHERE num_disks = %s', (num_disks,))
    total = cursor.fetchone()[0]
    rank = get_rank(cursor, num_disks, time_seconds, moves)
    cursor.close()
    conn.close()

    qualifies = rank <= MAX_ENTRIES or total < MAX_ENTRIES
    return jsonify({'qualifies': qualifies, 'rank': rank})


@app.route('/api/score', methods=['POST'])
def submit_score():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    user_id = data.get('user_id', '').strip()
    name = data.get('name', '').strip()
    country = data.get('country', '').strip()
    moves = data.get('moves', 0)
    time_seconds = data.get('time_seconds', 0)
    num_disks = data.get('num_disks', 4)

    # --- Validation ---
    if not validate_uuid(user_id):
        return jsonify({'error': 'Valid UUID v4 user_id required'}), 400
    if not name or len(name) > 30:
        return jsonify({'error': 'Name required (max 30 chars)'}), 400
    if not country or len(country) > 5:
        return jsonify({'error': 'Country required'}), 400
    if num_disks < 3 or num_disks > 9:
        return jsonify({'error': 'disks must be 3-9'}), 400
    if not isinstance(moves, int) or moves < 1:
        return jsonify({'error': 'Invalid moves'}), 400
    if not isinstance(time_seconds, int) or time_seconds < 0:
        return jsonify({'error': 'Invalid time'}), 400

    # Verify moves >= minimum possible (anti-cheat)
    min_moves = (2 ** num_disks) - 1
    if moves < min_moves:
        return jsonify({'error': 'Invalid score: moves below minimum'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # Check if this user already has an entry for this disk count
    cursor.execute('''
        SELECT id, time_seconds, moves FROM leaderboard
        WHERE user_id = %s AND num_disks = %s
    ''', (user_id, num_disks))
    existing = cursor.fetchone()

    if existing:
        # Only update if the new score is better (faster time, or same time but fewer moves)
        old_time = existing['time_seconds']
        old_moves = existing['moves']
        is_better = (time_seconds < old_time) or (time_seconds == old_time and moves < old_moves)

        if is_better:
            cursor.execute('''
                UPDATE leaderboard
                SET name = %s, country = %s, moves = %s, time_seconds = %s
                WHERE id = %s
            ''', (name, country, moves, time_seconds, existing['id']))
            conn.commit()
        else:
            # Score not better, keep existing — but still return current rank
            rank = get_rank(cursor, num_disks, old_time, old_moves)
            cursor.close()
            conn.close()
            return jsonify({
                'rank': rank,
                'message': f'You already have a better score (ranked #{rank})',
                'updated': False
            })
    else:
        # New entry — check if it qualifies
        cursor.execute('SELECT COUNT(*) as cnt FROM leaderboard WHERE num_disks = %s', (num_disks,))
        total = cursor.fetchone()['cnt']
        rank = get_rank(cursor, num_disks, time_seconds, moves)

        if rank > MAX_ENTRIES and total >= MAX_ENTRIES:
            cursor.close()
            conn.close()
            return jsonify({'rank': None, 'message': 'Score did not qualify for top 100', 'updated': False})

        cursor.execute('''
            INSERT INTO leaderboard (user_id, name, country, moves, time_seconds, num_disks)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (user_id, name, country, moves, time_seconds, num_disks))

    trim_leaderboard(cursor, num_disks)
    conn.commit()

    final_rank = get_rank(cursor, num_disks, time_seconds, moves)
    cursor.close()
    conn.close()

    return jsonify({'rank': final_rank, 'message': f'You are ranked #{final_rank}!', 'updated': True})


@app.route('/api/user/<user_id>/stats', methods=['GET'])
def user_stats(user_id):
    """Get a user's best scores across all disk counts."""
    if not validate_uuid(user_id):
        return jsonify({'error': 'Invalid user_id'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT num_disks, moves, time_seconds, name, country
        FROM leaderboard
        WHERE user_id = %s
        ORDER BY num_disks ASC
    ''', (user_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify([{
        'disks': r['num_disks'],
        'moves': r['moves'],
        'time': r['time_seconds'],
        'name': r['name'],
        'country': r['country']
    } for r in rows])


if __name__ == '__main__':
    init_db()
    print("🗼 Tower of Hanoi Leaderboard API")
    print("   Running on http://localhost:5000")
    print("   Database: MySQL (tower_of_hanoi)")
    print("   Features: UUID user_id, non-unique display names")
    print("   Endpoints:")
    print("     GET  /api/leaderboard?disks=N&user_id=UUID")
    print("     GET  /api/check-rank?disks=N&time=T&moves=M")
    print("     POST /api/score  {user_id, name, country, moves, time_seconds, num_disks}")
    print("     GET  /api/user/<uuid>/stats")
    app.run(host='0.0.0.0', port=5000, debug=True)
