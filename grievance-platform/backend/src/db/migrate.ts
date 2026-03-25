import pool from './pool';

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table (citizens, officers, ministry users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'officer', 'ministry')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ministries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ministries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        jurisdiction VARCHAR(100) DEFAULT 'National',
        categories TEXT[] NOT NULL DEFAULT '{}',
        contact VARCHAR(50),
        escalation_level INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Officers table (extends users for officers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS officers (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        ministry_id UUID REFERENCES ministries(id),
        designation VARCHAR(255),
        photo_url VARCHAR(500),
        rating DECIMAL(3,2) DEFAULT 0,
        total_resolved INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ministry users table (extends users for ministry role)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ministry_users (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        ministry_id UUID REFERENCES ministries(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Complaints table
    await client.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id VARCHAR(30) PRIMARY KEY,
        citizen_id UUID NOT NULL REFERENCES users(id),
        ministry_id UUID NOT NULL REFERENCES ministries(id),
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        urgency VARCHAR(10) NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
        status VARCHAR(20) NOT NULL DEFAULT 'submitted'
          CHECK (status IN ('submitted', 'assigned', 'in-progress', 'resolved', 'rejected')),
        assigned_officer_id UUID REFERENCES users(id),
        assigned_at TIMESTAMPTZ,
        resolution_notes TEXT,
        resolution_proof_url VARCHAR(500),
        citizen_rating INTEGER CHECK (citizen_rating BETWEEN 1 AND 5),
        citizen_review TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
    `);

    // Complaint documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS complaint_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id VARCHAR(30) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size INTEGER,
        uploaded_by UUID REFERENCES users(id),
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Complaint status history / audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS complaint_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id VARCHAR(30) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES users(id),
        changed_by_name VARCHAR(255),
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Messages (chat between citizen and officer)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id VARCHAR(30) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('citizen', 'officer')),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Officer ratings
    await client.query(`
      CREATE TABLE IF NOT EXISTS officer_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        officer_id UUID NOT NULL REFERENCES users(id),
        complaint_id VARCHAR(30) NOT NULL REFERENCES complaints(id),
        citizen_id UUID NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(complaint_id, citizen_id)
      );
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(assigned_officer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_complaints_ministry ON complaints(ministry_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_complaint ON messages(complaint_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_history(complaint_id);`);

    await client.query('COMMIT');
    console.log('✅ Migration complete — all tables created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(console.error);
