import _sqlite3
from flask import Flask, g

app = Flask(__name__)
Database = "mysql-nu-dtc1-food"

#Get dab
def get_db():
    if 'db' not in g:
        g.db = _sqlite3.connect(DATABASE)
    return g.db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"