-- D1 (SQLite) schema
-- 说明：图片二进制不存 D1；头像/评论图片存 R2，D1 只存 object_key 元数据

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- POI 评论表
CREATE TABLE IF NOT EXISTS poi_comments (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- POI 评分统计表（用于快速查询）
CREATE TABLE IF NOT EXISTS poi_ratings (
  poi_id TEXT PRIMARY KEY,
  total_ratings INTEGER DEFAULT 0,
  average_rating REAL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户头像（R2 对象元数据）
CREATE TABLE IF NOT EXISTS user_avatars (
  user_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 评论图片（R2 对象元数据）
CREATE TABLE IF NOT EXISTS poi_comment_images (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES poi_comments(id)
);

-- 打卡（定位 + 文字 + 1张图片；图片二进制存 R2）
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  text TEXT,
  image_object_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_poi_comments_poi_id ON poi_comments(poi_id);
CREATE INDEX IF NOT EXISTS idx_poi_comments_user_id ON poi_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_poi_comment_images_comment_id ON poi_comment_images(comment_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);