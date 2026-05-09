import pymysql  # Use pymysql
from flask import Flask, g

app = Flask(__name__)
DATABASE = "mysql-nu-dtc1-food.cn8u2ik2my4a.us-east-2.rds.amazonaws.com"  # SQLite file path


# Connection details from AWS RDS Console
host = "://aws.com"
user = "admin"
password = "password"
database = "your_db_name"

try:
    # Establish connection
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=3306,
        cursorclass=pymysql.cursors.DictCursor # Returns rows as dictionaries
    )

    with connection.cursor() as cursor:
        # Example: Create a table
        cursor.execute("CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY, name VARCHAR(255))")
        
        # Example: Insert data
        sql = "INSERT INTO users (id, name) VALUES (%s, %s)"
        cursor.execute(sql, (1, 'AWS User'))
        
        # Connection must commit to save changes
        connection.commit()

        # Example: Fetch data
        cursor.execute("SELECT * FROM users")
        result = cursor.fetchall()
        print(result)

finally:
    connection.close()