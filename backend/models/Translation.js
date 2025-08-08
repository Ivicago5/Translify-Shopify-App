const { getDatabase, isPostgres } = require('../db');

class Translation {
  static async create(data) {
    const db = getDatabase();
    const { 
      merchant_id, resource_type, resource_id, field, original_text, 
      translated_text, language, status = 'pending', auto_translated = false 
    } = data;
    
    if (isPostgres()) {
      // PostgreSQL version
      const now = new Date().toISOString();
      const result = await db.query(`
        INSERT INTO translations (
          merchant_id, resource_type, resource_id, field, original_text, 
          translated_text, language, status, auto_translated, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        merchant_id, resource_type, resource_id, field, original_text,
        translated_text, language, status, auto_translated, now, now
      ]);
      
      return { id: result.rows[0].id, ...data };
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          INSERT INTO translations (
            merchant_id, resource_type, resource_id, field, original_text, 
            translated_text, language, status, auto_translated, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const now = new Date().toISOString();
        stmt.run([
          merchant_id, resource_type, resource_id, field, original_text,
          translated_text, language, status, auto_translated, now, now
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...data });
          }
        });
        
        stmt.finalize();
      });
    }
  }

  static async findById(id) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const result = await db.getRow('SELECT * FROM translations WHERE id = $1', [id]);
      if (result) {
        result.auto_translated = Boolean(result.auto_translated);
      }
      return result;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM translations WHERE id = ?', [id], (err, row) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              row.auto_translated = Boolean(row.auto_translated);
            }
            resolve(row);
          }
        });
      });
    }
  }

  static async findByMerchant(merchantId) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const rows = await db.getRows('SELECT * FROM translations WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
      rows.forEach(row => {
        row.auto_translated = Boolean(row.auto_translated);
      });
      return rows;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM translations WHERE merchant_id = ? ORDER BY created_at DESC', [merchantId], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            rows.forEach(row => {
              row.auto_translated = Boolean(row.auto_translated);
            });
            resolve(rows);
          }
        });
      });
    }
  }

  static async findByResource(merchantId, resourceType, resourceId, language) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const query = `
        SELECT * FROM translations 
        WHERE merchant_id = $1 AND resource_type = $2 AND resource_id = $3
        ${language ? 'AND language = $4' : ''}
        ORDER BY created_at DESC
      `;
      const params = language ? [merchantId, resourceType, resourceId, language] : [merchantId, resourceType, resourceId];
      
      const rows = await db.getRows(query, params);
      rows.forEach(row => {
        row.auto_translated = Boolean(row.auto_translated);
      });
      return rows;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        const query = `
          SELECT * FROM translations 
          WHERE merchant_id = ? AND resource_type = ? AND resource_id = ?
          ${language ? 'AND language = ?' : ''}
          ORDER BY created_at DESC
        `;
        const params = language ? [merchantId, resourceType, resourceId, language] : [merchantId, resourceType, resourceId];
        
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            rows.forEach(row => {
              row.auto_translated = Boolean(row.auto_translated);
            });
            resolve(rows);
          }
        });
      });
    }
  }

  static async findByLanguage(merchantId, language, status) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const query = `
        SELECT * FROM translations 
        WHERE merchant_id = $1 AND language = $2
        ${status ? 'AND status = $3' : ''}
        ORDER BY created_at DESC
      `;
      const params = status ? [merchantId, language, status] : [merchantId, language];
      
      const rows = await db.getRows(query, params);
      rows.forEach(row => {
        row.auto_translated = Boolean(row.auto_translated);
      });
      return rows;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        const query = `
          SELECT * FROM translations 
          WHERE merchant_id = ? AND language = ?
          ${status ? 'AND status = ?' : ''}
          ORDER BY created_at DESC
        `;
        const params = status ? [merchantId, language, status] : [merchantId, language];
        
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            rows.forEach(row => {
              row.auto_translated = Boolean(row.auto_translated);
            });
            resolve(rows);
          }
        });
      });
    }
  }

  static async update(id, updates) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      
      const query = `
        UPDATE translations 
        SET ${fields.map((f, i) => `${f} = $${i + 1}`).join(', ')}
        WHERE id = $${fields.length + 1}
      `;
      
      const result = await db.update(query, [...values, id]);
      return { changes: result };
    } else {
      // SQLite version
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      
      const query = `
        UPDATE translations 
        SET ${fields.map(f => `${f} = ?`).join(', ')}
        WHERE id = ?
      `;
      
      return new Promise((resolve, reject) => {
        db.run(query, [...values, id], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        });
      });
    }
  }

  static async updateStatus(id, status) {
    return this.update(id, { status, updated_at: new Date().toISOString() });
  }

  static async updateTranslatedText(id, translatedText) {
    return this.update(id, { 
      translated_text: translatedText, 
      status: 'completed',
      updated_at: new Date().toISOString() 
    });
  }

  static async delete(id) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const result = await db.remove('DELETE FROM translations WHERE id = $1', [id]);
      return { changes: result };
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.run('DELETE FROM translations WHERE id = ?', [id], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        });
      });
    }
  }

  static async getPending(merchantId, limit = 50) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const rows = await db.getRows(
        'SELECT * FROM translations WHERE merchant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3',
        [merchantId, 'pending', limit]
      );
      rows.forEach(row => {
        row.auto_translated = Boolean(row.auto_translated);
      });
      return rows;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM translations WHERE merchant_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT ?',
          [merchantId, limit],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              rows.forEach(row => {
                row.auto_translated = Boolean(row.auto_translated);
              });
              resolve(rows);
            }
          }
        );
      });
    }
  }

  static async getStats(merchantId) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      try {
        // Get counts by status
        const statusRows = await db.getRows(
          'SELECT status, COUNT(*) as count FROM translations WHERE merchant_id = $1 GROUP BY status',
          [merchantId]
        );

        const byStatus = {};
        let total = 0;
        if (statusRows) {
          statusRows.forEach(row => {
            byStatus[row.status] = parseInt(row.count);
            total += parseInt(row.count);
          });
        }

        // Get counts by language
        const languageRows = await db.getRows(
          'SELECT language, COUNT(*) as count FROM translations WHERE merchant_id = $1 GROUP BY language',
          [merchantId]
        );

        const byLanguage = {};
        languageRows.forEach(row => {
          byLanguage[row.language] = parseInt(row.count);
        });

        // Get completed counts by language
        const completedRows = await db.getRows(
          'SELECT language, COUNT(*) as count FROM translations WHERE merchant_id = $1 AND status = $2 GROUP BY language',
          [merchantId, 'completed']
        );

        const byLanguageCompleted = {};
        completedRows.forEach(row => {
          byLanguageCompleted[row.language] = parseInt(row.count);
        });

        // Calculate progress per language
        const byLanguageProgress = {};
        Object.keys(byLanguage).forEach(lang => {
          const completed = byLanguageCompleted[lang] || 0;
          const total = byLanguage[lang] || 0;
          byLanguageProgress[lang] = total > 0 ? Math.round((completed / total) * 100) : 0;
        });

        // Get auto-translated count
        const autoRow = await db.getRow(
          'SELECT COUNT(*) as count FROM translations WHERE merchant_id = $1 AND auto_translated = $2',
          [merchantId, true]
        );

        return {
          byStatus,
          byLanguage,
          byLanguageCompleted,
          byLanguageProgress,
          auto_translated: autoRow ? parseInt(autoRow.count) : 0,
          total
        };
      } catch (error) {
        console.error('Error getting stats:', error);
        return {
          byStatus: {},
          byLanguage: {},
          byLanguageCompleted: {},
          byLanguageProgress: {},
          auto_translated: 0,
          total: 0
        };
      }
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        // Get counts by status
        db.all(
          'SELECT status, COUNT(*) as count FROM translations WHERE merchant_id = ? GROUP BY status',
          [merchantId],
          (err, statusRows) => {
            if (err) {
              reject(err);
            } else {
              const byStatus = {};
              let total = 0;
              if (statusRows) {
                statusRows.forEach(row => {
                  byStatus[row.status] = row.count;
                  total += row.count;
                });
              }

              // Get counts by language
              db.all(
                'SELECT language, COUNT(*) as count FROM translations WHERE merchant_id = ? GROUP BY language',
                [merchantId],
                (err, languageRows) => {
                  if (err) {
                    reject(err);
                  } else {
                    const byLanguage = {};
                    languageRows.forEach(row => {
                      byLanguage[row.language] = row.count;
                    });

                    // Get completed counts by language
                    db.all(
                      'SELECT language, COUNT(*) as count FROM translations WHERE merchant_id = ? AND status = "completed" GROUP BY language',
                      [merchantId],
                      (err, completedRows) => {
                        if (err) {
                          reject(err);
                        } else {
                          const byLanguageCompleted = {};
                          completedRows.forEach(row => {
                            byLanguageCompleted[row.language] = row.count;
                          });

                          // Calculate progress per language
                          const byLanguageProgress = {};
                          Object.keys(byLanguage).forEach(lang => {
                            const completed = byLanguageCompleted[lang] || 0;
                            const total = byLanguage[lang] || 0;
                            byLanguageProgress[lang] = total > 0 ? Math.round((completed / total) * 100) : 0;
                          });

                          // Get auto-translated count
                          db.get(
                            'SELECT COUNT(*) as count FROM translations WHERE merchant_id = ? AND auto_translated = 1',
                            [merchantId],
                            (err, autoRow) => {
                              if (err) {
                                reject(err);
                              } else {
                                resolve({
                                  byStatus,
                                  byLanguage,
                                  byLanguageCompleted,
                                  byLanguageProgress,
                                  auto_translated: autoRow ? autoRow.count : 0,
                                  total
                                });
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      });
    }
  }

  static async getMemory(merchantId) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const rows = await db.getRows(`
        SELECT original_text, translated_text, language, resource_type, COUNT(*) as usage_count
        FROM translations 
        WHERE merchant_id = $1 AND status = $2 AND translated_text IS NOT NULL
        GROUP BY original_text, translated_text, language
        ORDER BY usage_count DESC
        LIMIT 100
      `, [merchantId, 'completed']);
      return rows;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT original_text, translated_text, language, resource_type, COUNT(*) as usage_count
          FROM translations 
          WHERE merchant_id = ? AND status = 'completed' AND translated_text IS NOT NULL
          GROUP BY original_text, translated_text, language
          ORDER BY usage_count DESC
          LIMIT 100
        `, [merchantId], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  }

  static async addToMemory(merchantId, memoryEntry) {
    // This is a simplified version - in a real app, you might want a separate memory table
    // For now, we'll just log it for demonstration
    console.log('Adding to translation memory:', memoryEntry);
    return Promise.resolve();
  }

  static async bulkCreate(translations) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const now = new Date().toISOString();
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      translations.forEach(translation => {
        const { 
          merchant_id, resource_type, resource_id, field, original_text, 
          translated_text, language, status = 'pending', auto_translated = false 
        } = translation;
        
        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`);
        values.push(merchant_id, resource_type, resource_id, field, original_text, translated_text, language, status, auto_translated, now, now);
        paramIndex += 11;
      });
      
      const query = `
        INSERT INTO translations (
          merchant_id, resource_type, resource_id, field, original_text, 
          translated_text, language, status, auto_translated, created_at, updated_at
        ) VALUES ${placeholders.join(', ')}
      `;
      
      await db.query(query, values);
      return { created: translations.length };
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          const stmt = db.prepare(`
            INSERT INTO translations (
              merchant_id, resource_type, resource_id, field, original_text, 
              translated_text, language, status, auto_translated, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const now = new Date().toISOString();
          translations.forEach(translation => {
            const { 
              merchant_id, resource_type, resource_id, field, original_text, 
              translated_text, language, status = 'pending', auto_translated = false 
            } = translation;
            
            stmt.run([
              merchant_id, resource_type, resource_id, field, original_text,
              translated_text, language, status, auto_translated, now, now
            ]);
          });
          
          stmt.finalize((err) => {
            if (err) {
              reject(err);
            } else {
              resolve({ created: translations.length });
            }
          });
        });
      });
    }
  }

  static async findNeedingSync(merchantId) {
    const db = getDatabase();
    
    if (isPostgres()) {
      // PostgreSQL version
      const rows = await db.getRows(`
        SELECT * FROM translations 
        WHERE merchant_id = $1 AND status = $2 AND synced_to_shopify = $3
        ORDER BY updated_at DESC
      `, [merchantId, 'completed', false]);
      rows.forEach(row => {
        row.auto_translated = Boolean(row.auto_translated);
      });
      return rows;
    } else {
      // SQLite version
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM translations 
          WHERE merchant_id = ? AND status = 'completed' AND synced_to_shopify = 0
          ORDER BY updated_at DESC
        `, [merchantId], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            rows.forEach(row => {
              row.auto_translated = Boolean(row.auto_translated);
            });
            resolve(rows);
          }
        });
      });
    }
  }
}

module.exports = Translation;
