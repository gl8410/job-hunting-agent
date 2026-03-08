import psycopg2
try:
    conn = psycopg2.connect('postgresql://jobhunter:jobhunter_pass@localhost:5435/jbh_db')
    cur = conn.cursor()
    cur.execute('ALTER TABLE resume_templates ADD COLUMN cover_letter_content TEXT;')
    conn.commit()
    cur.close()
    conn.close()
    print('Migration complete.')
except Exception as e:
    print('Error:', e)
