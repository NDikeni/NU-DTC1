import pymysql
import uuid
from configparser import ConfigParser
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import json
import os 
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

VALID_MEAL_PERIODS = {"BREAKFAST", "LUNCH", "DINNER"}

VALID_DINING_HALLS = {
  "SARGE",
  "ALLISON",
  "PLEX-EAST",
  "PLEX-WEST",
  "ELDER"
}


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.ini")

def get_config():
  configur = ConfigParser()
  files_read = configur.read(CONFIG_PATH)

  if len(files_read) == 0:
    raise Exception(f"config.ini not found at {CONFIG_PATH}")

  return configur


def get_s3_config():
  configur = get_config()

  bucket_name = configur.get("s3", "bucket_name")
  region = configur.get("s3", "region")

  return bucket_name, region



def get_dbConn():
  try:
    config_file = "config.ini"

    configur = ConfigParser()
    configur.read(config_file)

    endpoint = configur.get("rds", "endpoint")
    portnum = int(configur.get("rds", "port_number"))
    username = configur.get("rds", "user_name")
    pwd = configur.get("rds", "user_pwd")
    dbname = configur.get("rds", "db_name")

    dbConn = pymysql.connect(
      host=endpoint,
      port=portnum,
      user=username,
      passwd=pwd,
      database=dbname,
      cursorclass=pymysql.cursors.DictCursor,
      autocommit=False
    )

    return dbConn

  except Exception as err:
    print("**ERROR in get_dbConn():")
    print(str(err))
    return None


def validate_meal_period(meal_period):
  return meal_period in VALID_MEAL_PERIODS


def validate_dining_hall(dining_hall):
  return dining_hall in VALID_DINING_HALLS


def get_day_of_week():
  return datetime.now().strftime("%A")


def create_or_get_user(username):
  dbConn = None

  try:
    dbConn = get_dbConn()

    if dbConn is None:
      return None, "database connection failed"

    dbCursor = dbConn.cursor()

    sql = """
      SELECT username, user_uuid
      FROM auth
      WHERE username = %s;
    """

    dbCursor.execute(sql, [username])
    existing_user = dbCursor.fetchone()

    if existing_user is not None:
      return existing_user, None

    user_uuid = str(uuid.uuid4())

    sql = """
      INSERT INTO auth(username, user_uuid)
      VALUES(%s, %s);
    """

    dbCursor.execute(sql, [username, user_uuid])
    dbConn.commit()

    return {
      "username": username,
      "user_uuid": user_uuid
    }, None

  except Exception as err:
    if dbConn is not None:
      dbConn.rollback()

    print("**ERROR in create_or_get_user():")
    print(str(err))
    return None, str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


def add_food(food_name, meal_period, s3_bucket_id, dining_halls):
  dbConn = None

  try:
    if not validate_meal_period(meal_period):
      return None, "invalid meal_period"

    if not isinstance(dining_halls, list) or len(dining_halls) == 0:
      return None, "dining_halls must be a non-empty list"

    for hall in dining_halls:
      if not validate_dining_hall(hall):
        return None, f"invalid dining hall: {hall}"

    dbConn = get_dbConn()

    if dbConn is None:
      return None, "database connection failed"

    dbCursor = dbConn.cursor()
    food_uuid = str(uuid.uuid4())

    dbConn.begin()

    sql = """
      INSERT INTO food(
        food_uuid,
        food_name,
        users_liked_count,
        meal_period,
        s3_bucket_id
      )
      VALUES(%s, %s, %s, %s, %s);
    """

    dbCursor.execute(sql, [
      food_uuid,
      food_name,
      0,
      meal_period,
      s3_bucket_id
    ])

    sql = """
      INSERT INTO food_dining_halls(
        food_uuid,
        dining_hall
      )
      VALUES(%s, %s);
    """

    for hall in dining_halls:
      dbCursor.execute(sql, [food_uuid, hall])

    dbConn.commit()

    return food_uuid, None

  except Exception as err:
    if dbConn is not None:
      dbConn.rollback()

    print("**ERROR in add_food():")
    print(str(err))
    return None, str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


def get_foods(user_uuid=None, meal_period=None, dining_hall=None):
  dbConn = None

  try:
    if meal_period is not None and not validate_meal_period(meal_period):
      return None, "invalid meal_period"

    if dining_hall is not None and not validate_dining_hall(dining_hall):
      return None, "invalid dining_hall"

    dbConn = get_dbConn()

    if dbConn is None:
      return None, "database connection failed"

    dbCursor = dbConn.cursor()

    params = []

    liked_join = ""
    liked_select = "FALSE AS is_liked_by_user"

    if user_uuid is not None:
      liked_join = """
        LEFT JOIN user_preferences up
          ON up.food_uuid = f.food_uuid
         AND up.user_uuid = %s
         AND up.dining_hall_name = fdh.dining_hall
      """
      liked_select = "CASE WHEN up.preference_id IS NULL THEN FALSE ELSE TRUE END AS is_liked_by_user"
      params.append(user_uuid)

    where_clauses = []

    if meal_period is not None:
      where_clauses.append("f.meal_period = %s")
      params.append(meal_period)

    if dining_hall is not None:
      where_clauses.append("fdh.dining_hall = %s")
      params.append(dining_hall)

    where_sql = ""

    if len(where_clauses) > 0:
      where_sql = "WHERE " + " AND ".join(where_clauses)

    sql = f"""
      SELECT
        f.food_uuid,
        f.food_name,
        f.users_liked_count,
        f.meal_period,
        f.s3_bucket_id,
        fdh.dining_hall,
        {liked_select}
      FROM food f
      INNER JOIN food_dining_halls fdh
        ON f.food_uuid = fdh.food_uuid
      {liked_join}
      {where_sql}
      ORDER BY fdh.dining_hall, f.meal_period, f.food_name;
    """

    dbCursor.execute(sql, params)
    rows = dbCursor.fetchall()

    foods = []

    for row in rows:
      foods.append({
        "food_uuid": row["food_uuid"],
        "food_name": row["food_name"],
        "users_liked_count": row["users_liked_count"],
        "meal_period": row["meal_period"],
        "s3_bucket_id": row["s3_bucket_id"],
        "dining_hall": row["dining_hall"],
        "is_liked_by_user": bool(row["is_liked_by_user"])
      })

    return foods, None

  except Exception as err:
    print("**ERROR in get_foods():")
    print(str(err))
    return None, str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


def like_food(user_uuid, food_uuid, dining_hall):
  dbConn = None

  try:
    if not validate_dining_hall(dining_hall):
      return None, "invalid dining_hall"

    dbConn = get_dbConn()

    if dbConn is None:
      return None, "database connection failed"

    dbCursor = dbConn.cursor()

    dbConn.begin()

    sql = """
      SELECT user_uuid
      FROM auth
      WHERE user_uuid = %s;
    """

    dbCursor.execute(sql, [user_uuid])

    if dbCursor.fetchone() is None:
      dbConn.rollback()
      return None, "user does not exist"

    sql = """
      SELECT f.food_uuid
      FROM food f
      INNER JOIN food_dining_halls fdh
        ON f.food_uuid = fdh.food_uuid
      WHERE f.food_uuid = %s
        AND fdh.dining_hall = %s;
    """

    dbCursor.execute(sql, [food_uuid, dining_hall])

    if dbCursor.fetchone() is None:
      dbConn.rollback()
      return None, "food does not exist at this dining hall"

    sql = """
      SELECT preference_id
      FROM user_preferences
      WHERE user_uuid = %s
        AND food_uuid = %s
        AND dining_hall_name = %s;
    """

    dbCursor.execute(sql, [user_uuid, food_uuid, dining_hall])
    existing_like = dbCursor.fetchone()

    if existing_like is not None:
      dbConn.commit()

      return {
        "food_uuid": food_uuid,
        "dining_hall": dining_hall,
        "liked": True,
        "already_liked": True
      }, None

    now = datetime.now()

    sql = """
      INSERT INTO user_preferences(
        user_uuid,
        food_uuid,
        preference_date,
        preference_time,
        dining_hall_name,
        day_of_week
      )
      VALUES(%s, %s, %s, %s, %s, %s);
    """

    dbCursor.execute(sql, [
      user_uuid,
      food_uuid,
      now.date(),
      now.time(),
      dining_hall,
      get_day_of_week()
    ])

    sql = """
      UPDATE food
      SET users_liked_count = users_liked_count + 1
      WHERE food_uuid = %s;
    """

    dbCursor.execute(sql, [food_uuid])

    dbConn.commit()

    return {
      "food_uuid": food_uuid,
      "dining_hall": dining_hall,
      "liked": True,
      "already_liked": False
    }, None

  except Exception as err:
    if dbConn is not None:
      dbConn.rollback()

    print("**ERROR in like_food():")
    print(str(err))
    return None, str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


def unlike_food(user_uuid, food_uuid, dining_hall):
  dbConn = None

  try:
    if not validate_dining_hall(dining_hall):
      return None, "invalid dining_hall"

    dbConn = get_dbConn()

    if dbConn is None:
      return None, "database connection failed"

    dbCursor = dbConn.cursor()

    dbConn.begin()

    sql = """
      SELECT preference_id
      FROM user_preferences
      WHERE user_uuid = %s
        AND food_uuid = %s
        AND dining_hall_name = %s;
    """

    dbCursor.execute(sql, [user_uuid, food_uuid, dining_hall])
    existing_like = dbCursor.fetchone()

    if existing_like is None:
      dbConn.commit()

      return {
        "food_uuid": food_uuid,
        "dining_hall": dining_hall,
        "liked": False,
        "already_unliked": True
      }, None

    sql = """
      DELETE FROM user_preferences
      WHERE user_uuid = %s
        AND food_uuid = %s
        AND dining_hall_name = %s;
    """

    dbCursor.execute(sql, [user_uuid, food_uuid, dining_hall])

    sql = """
      UPDATE food
      SET users_liked_count = GREATEST(users_liked_count - 1, 0)
      WHERE food_uuid = %s;
    """

    dbCursor.execute(sql, [food_uuid])

    dbConn.commit()

    return {
      "food_uuid": food_uuid,
      "dining_hall": dining_hall,
      "liked": False,
      "already_unliked": False
    }, None

  except Exception as err:
    if dbConn is not None:
      dbConn.rollback()

    print("**ERROR in unlike_food():")
    print(str(err))
    return None, str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


def get_user_favorites(user_uuid):
  dbConn = None

  try:
    dbConn = get_dbConn()

    if dbConn is None:
      return None, "database connection failed"

    dbCursor = dbConn.cursor()

    sql = """
      SELECT
        f.food_uuid,
        f.food_name,
        f.users_liked_count,
        f.meal_period,
        f.s3_bucket_id,
        up.dining_hall_name AS dining_hall,
        up.preference_date,
        up.preference_time,
        up.day_of_week
      FROM user_preferences up
      INNER JOIN food f
        ON up.food_uuid = f.food_uuid
      WHERE up.user_uuid = %s
      ORDER BY up.preference_date DESC, up.preference_time DESC;
    """

    dbCursor.execute(sql, [user_uuid])
    rows = dbCursor.fetchall()

    favorites = []

    for row in rows:
      favorites.append({
        "food_uuid": row["food_uuid"],
        "food_name": row["food_name"],
        "users_liked_count": row["users_liked_count"],
        "meal_period": row["meal_period"],
        "s3_bucket_id": row["s3_bucket_id"],
        "dining_hall": row["dining_hall"],
        "preference_date": str(row["preference_date"]),
        "preference_time": str(row["preference_time"]),
        "day_of_week": row["day_of_week"],
        "is_liked_by_user": True
      })

    return favorites, None

  except Exception as err:
    print("**ERROR in get_user_favorites():")
    print(str(err))
    return None, str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


@app.route("/", methods=["GET"])
def api_health_check():
  return jsonify({
    "message": "dining app backend is running"
  }), 200


@app.route("/users", methods=["POST"])
def api_create_or_get_user():
  try:
    data = request.get_json()

    if data is None:
      return jsonify({
        "error": "missing JSON body"
      }), 400

    if "username" not in data:
      return jsonify({
        "error": "missing field: username"
      }), 400

    user, error = create_or_get_user(data["username"])

    if error is not None:
      return jsonify({
        "error": error
      }), 500

    return jsonify({
      "user": user
    }), 200

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


@app.route("/foods", methods=["POST"])
def api_add_food():
  try:
    data = request.get_json()

    if data is None:
      return jsonify({
        "error": "missing JSON body"
      }), 400

    required_fields = [
      "food_name",
      "meal_period",
      "dining_halls"
    ]

    for field in required_fields:
      if field not in data:
        return jsonify({
          "error": f"missing field: {field}"
        }), 400

    food_uuid, error = add_food(
      data["food_name"],
      data["meal_period"],
      data.get("s3_bucket_id"),
      data["dining_halls"]
    )

    if error is not None:
      return jsonify({
        "error": error
      }), 500

    return jsonify({
      "message": "food added successfully",
      "food_uuid": food_uuid
    }), 201

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


@app.route("/foods", methods=["GET"])
def api_get_foods():
  try:
    user_uuid = request.args.get("user_uuid")
    meal_period = request.args.get("meal_period")
    dining_hall = request.args.get("dining_hall")

    foods, error = get_foods(
      user_uuid=user_uuid,
      meal_period=meal_period,
      dining_hall=dining_hall
    )

    if error is not None:
      return jsonify({
        "error": error
      }), 400

    return jsonify({
      "foods": foods
    }), 200

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


@app.route("/users/<user_uuid>/favorites", methods=["GET"])
def api_get_user_favorites(user_uuid):
  try:
    favorites, error = get_user_favorites(user_uuid)

    if error is not None:
      return jsonify({
        "error": error
      }), 500

    return jsonify({
      "favorites": favorites
    }), 200

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


@app.route("/users/<user_uuid>/favorites", methods=["POST"])
def api_like_food(user_uuid):
  try:
    data = request.get_json()

    if data is None:
      return jsonify({
        "error": "missing JSON body"
      }), 400

    required_fields = [
      "food_uuid",
      "dining_hall"
    ]

    for field in required_fields:
      if field not in data:
        return jsonify({
          "error": f"missing field: {field}"
        }), 400

    result, error = like_food(
      user_uuid=user_uuid,
      food_uuid=data["food_uuid"],
      dining_hall=data["dining_hall"]
    )

    if error is not None:
      return jsonify({
        "error": error
      }), 400

    return jsonify({
      "message": "food liked successfully",
      "result": result
    }), 200

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


@app.route("/users/<user_uuid>/favorites", methods=["DELETE"])
def api_unlike_food(user_uuid):
  try:
    data = request.get_json()

    if data is None:
      return jsonify({
        "error": "missing JSON body"
      }), 400

    required_fields = [
      "food_uuid",
      "dining_hall"
    ]

    for field in required_fields:
      if field not in data:
        return jsonify({
          "error": f"missing field: {field}"
        }), 400

    result, error = unlike_food(
      user_uuid=user_uuid,
      food_uuid=data["food_uuid"],
      dining_hall=data["dining_hall"]
    )

    if error is not None:
      return jsonify({
        "error": error
      }), 400

    return jsonify({
      "message": "food unliked successfully",
      "result": result
    }), 200

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


def clear_database():
  dbConn = None

  try:
    dbConn = get_dbConn()

    if dbConn is None:
      return "database connection failed"

    dbCursor = dbConn.cursor()

    dbConn.begin()

    dbCursor.execute("DELETE FROM user_preferences;")
    dbCursor.execute("DELETE FROM food_dining_halls;")
    dbCursor.execute("DELETE FROM food;")
    dbCursor.execute("DELETE FROM auth;")

    dbConn.commit()

    return None

  except Exception as err:
    if dbConn is not None:
      dbConn.rollback()

    return str(err)

  finally:
    if dbConn is not None:
      dbConn.close()


@app.route("/reset", methods=["DELETE"])
def api_reset_database():
  try:
    error = clear_database()

    if error is not None:
      return jsonify({
        "error": error
      }), 500

    return jsonify({
      "message": "database cleared successfully"
    }), 200

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500
    
    

def upload_image_to_s3(image_file):
  try:
    
    bucket_name, region = get_s3_config()

    print("---- S3 UPLOAD DEBUG ----")
    print("bucket:", bucket_name)
    print("region:", region)
    print("filename:", image_file.filename)
    print("content_type:", image_file.content_type)

    original_filename = secure_filename(image_file.filename)

    if "." not in original_filename:
      return None, "image file must have an extension"

    extension = original_filename.rsplit(".", 1)[-1].lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
      return None, f"invalid image type: {extension}"

    object_key = f"food-images/{uuid.uuid4()}.{extension}"

    s3_client = boto3.client("s3", region_name=region)

    image_file.stream.seek(0)

    s3_client.upload_fileobj(
      image_file.stream,
      bucket_name,
      object_key,
      ExtraArgs={
        "ContentType": image_file.content_type or f"image/{extension}",
      }
    )

    print("uploaded object_key:", object_key)
    print("-------------------------")

    return object_key, None

  except NoCredentialsError:
    print("**ERROR in upload_image_to_s3(): missing AWS credentials")
    return None, "missing AWS credentials"

  except ClientError as err:
    print("**AWS ClientError in upload_image_to_s3():")
    print(err)
    return None, str(err)

  except Exception as err:
    print("**ERROR in upload_image_to_s3():")
    print(str(err))
    return None, str(err)


@app.route("/foods/upload", methods=["POST"])
def api_add_food_with_image():
  try:
    food_name = request.form.get("food_name")
    meal_period = request.form.get("meal_period")
    dining_halls_raw = request.form.get("dining_halls")
    image_file = request.files.get("image")

    if food_name is None or food_name.strip() == "":
      return jsonify({
        "error": "missing field: food_name"
      }), 400

    if meal_period is None:
      return jsonify({
        "error": "missing field: meal_period"
      }), 400

    if not validate_meal_period(meal_period):
      return jsonify({
        "error": "invalid meal_period"
      }), 400

    if dining_halls_raw is None:
      return jsonify({
        "error": "missing field: dining_halls"
      }), 400

    try:
      dining_halls = json.loads(dining_halls_raw)
    except Exception:
      return jsonify({
        "error": "dining_halls must be a JSON array"
      }), 400

    if not isinstance(dining_halls, list) or len(dining_halls) == 0:
      return jsonify({
        "error": "dining_halls must be a non-empty JSON array"
      }), 400

    for hall in dining_halls:
      if not validate_dining_hall(hall):
        return jsonify({
          "error": f"invalid dining hall: {hall}"
        }), 400

    s3_object_key = None

    if image_file is not None and image_file.filename != "":
      s3_object_key, upload_error = upload_image_to_s3(image_file)

      if upload_error is not None:
        return jsonify({
          "error": upload_error
        }), 500

    food_uuid, error = add_food(
      food_name=food_name.strip(),
      meal_period=meal_period,
      s3_bucket_id=s3_object_key,
      dining_halls=dining_halls
    )

    if error is not None:
      return jsonify({
        "error": error
      }), 500

    created_food = {
      "food_uuid": food_uuid,
      "food_name": food_name.strip(),
      "users_liked_count": 0,
      "meal_period": meal_period,
      "s3_bucket_id": s3_object_key,
      "dining_halls": dining_halls,
      "is_liked_by_user": False
    }

    return jsonify({
      "message": "food added successfully",
      "food": created_food
    }), 201

  except Exception as err:
    return jsonify({
      "error": str(err)
    }), 500


@app.route("/debug/s3", methods=["GET"])
def debug_s3_connection():
  try:
    print("RUNNING UPDATED DEBUG S3 ROUTE")

    bucket_name, region = get_s3_config()

    print("bucket_name:", bucket_name)
    print("region:", region)

    s3_client = boto3.client("s3", region_name=region)

    response = s3_client.head_bucket(Bucket=bucket_name)

    return jsonify({
      "message": "S3 connection successful",
      "bucket_name": bucket_name,
      "region": region,
      "response": str(response)
    }), 200

  except Exception as err:
    print("**ERROR in debug_s3_connection():")
    print(type(err))
    print(str(err))

    return jsonify({
      "error_type": type(err).__name__,
      "error": str(err)
    }), 500

if __name__ == "__main__":
  app.run(
    host="0.0.0.0",
    port=5000,
    debug=True
  )