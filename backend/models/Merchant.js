const { getDatabase, isPostgres } = require('../db');

class Merchant {
  /**
   * Create a new merchant
   */
  static async create(shopDomain, accessToken, settings = {}) {
    const db = getDatabase();
    const settingsJson = JSON.stringify(settings);
    
    if (isPostgres()) {
      // PostgreSQL version
      const result = await db.query(
        'INSERT INTO merchants (shop_domain, access_token, settings) VALUES ($1, $2, $3) RETURNING *',
        [shopDomain, accessToken, settingsJson]
      );
      return { id: result.rows[0].id, shop_domain: shopDomain };
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO merchants (shop_domain, access_token, settings) VALUES (?, ?, ?)',
          [shopDomain, accessToken, settingsJson],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, shop_domain: shopDomain });
            }
          }
        );
      });
    }
  }

  /**
   * Find merchant by shop domain
   */
  static async findByDomain(shopDomain) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const row = await db.getRow('SELECT * FROM merchants WHERE shop_domain = $1', [shopDomain]);
      if (row) {
        row.settings = JSON.parse(row.settings || '{}');
      }
      return row;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM merchants WHERE shop_domain = ?',
          [shopDomain],
          (err, row) => {
            if (err) {
              reject(err);
            } else {
              if (row) {
                row.settings = JSON.parse(row.settings || '{}');
              }
              resolve(row);
            }
          }
        );
      });
    }
  }

  /**
   * Find merchant by ID
   */
  static async findById(id) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const row = await db.getRow('SELECT * FROM merchants WHERE id = $1', [id]);
      if (row) {
        row.settings = JSON.parse(row.settings || '{}');
      }
      return row;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM merchants WHERE id = ?',
          [id],
          (err, row) => {
            if (err) {
              reject(err);
            } else {
              if (row) {
                row.settings = JSON.parse(row.settings || '{}');
              }
              resolve(row);
            }
          }
        );
      });
    }
  }

  /**
   * Update merchant settings
   */
  static async updateSettings(merchantId, settings) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const settingsJson = JSON.stringify(settings);
      
      db.run(
        'UPDATE merchants SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [settingsJson, merchantId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  /**
   * Update access token
   */
  static async updateAccessToken(merchantId, accessToken) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.run(
        'UPDATE merchants SET access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [accessToken, merchantId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  /**
   * Get all merchants (for admin purposes)
   */
  static async findAll() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.all(
        'SELECT * FROM merchants ORDER BY created_at DESC',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            rows.forEach(row => {
              row.settings = JSON.parse(row.settings || '{}');
            });
            resolve(rows);
          }
        }
      );
    });
  }

  /**
   * Delete merchant and all related data
   */
  static async delete(merchantId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.run(
        'DELETE FROM merchants WHERE id = ?',
        [merchantId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  /**
   * Get merchant statistics
   */
  static async getStats(merchantId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      const queries = [
        // Total translations
        'SELECT COUNT(*) as total FROM translations WHERE merchant_id = ?',
        // Pending translations
        'SELECT COUNT(*) as pending FROM translations WHERE merchant_id = ? AND status = "pending"',
        // Completed translations
        'SELECT COUNT(*) as completed FROM translations WHERE merchant_id = ? AND status = "completed"',
        // Auto-translated count
        'SELECT COUNT(*) as auto_translated FROM translations WHERE merchant_id = ? AND auto_translated = 1'
      ];

      const results = {};
      let completed = 0;

      queries.forEach((query, index) => {
        db.get(query, [merchantId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const keys = ['total', 'pending', 'completed', 'auto_translated'];
          results[keys[index]] = row ? row[keys[index]] : 0;

          completed++;
          if (completed === queries.length) {
            resolve(results);
          }
        });
      });
    });
  }
}

module.exports = Merchant;
