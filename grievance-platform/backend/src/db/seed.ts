import pool from './pool';
import bcrypt from 'bcryptjs';

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Ministries ──────────────────────────────────────────────────────────
    const ministries = [
      {
        name: 'Ministry of Road Transport and Highways',
        jurisdiction: 'National',
        categories: ['Roads', 'Highways', 'Traffic', 'Road Safety', 'Toll Booths'],
        contact: '1800-111-555',
        escalation_level: 1,
      },
      {
        name: 'Ministry of Power',
        jurisdiction: 'National',
        categories: ['Electricity', 'Power Supply', 'Billing', 'Load Shedding', 'Solar Energy'],
        contact: '1912',
        escalation_level: 1,
      },
      {
        name: 'Ministry of Jal Shakti (Water Resources)',
        jurisdiction: 'National',
        categories: ['Water Supply', 'Drainage', 'Sanitation', 'Water Quality', 'Flood Relief'],
        contact: '1800-180-1551',
        escalation_level: 1,
      },
      {
        name: 'Ministry of Home Affairs',
        jurisdiction: 'National',
        categories: ['Police', 'Safety', 'Crime', 'Emergency', 'Border Security'],
        contact: '100',
        escalation_level: 2,
      },
      {
        name: 'Central Vigilance Commission',
        jurisdiction: 'National',
        categories: ['Corruption', 'Bribery', 'Malpractice', 'Financial Irregularities'],
        contact: '1800-11-9000',
        escalation_level: 3,
      },
      {
        name: 'Ministry of Health and Family Welfare',
        jurisdiction: 'National',
        categories: ['Healthcare', 'Medical Services', 'Sanitation', 'Public Health', 'Hospitals'],
        contact: '1800-180-1104',
        escalation_level: 1,
      },
    ];

    const ministryIds: Record<string, string> = {};
    for (const m of ministries) {
      const res = await client.query(
        `INSERT INTO ministries (name, jurisdiction, categories, contact, escalation_level)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [m.name, m.jurisdiction, m.categories, m.contact, m.escalation_level]
      );
      ministryIds[m.name] = res.rows[0].id;
    }

    // ── Citizens ────────────────────────────────────────────────────────────
    const citizenPassword = await bcrypt.hash('citizen123', 10);
    const citizens: Record<string, string> = {};

    for (const [name, email, phone] of [
      ['Arjun Mehta', 'arjun.mehta@email.com', '9123456789'],
      ['Kavita Singh', 'kavita.singh@email.com', '9123456790'],
      ['Rohit Desai', 'rohit.desai@email.com', '9123456791'],
    ]) {
      const r = await client.query(
        `INSERT INTO users (name, email, password_hash, phone, role)
         VALUES ($1, $2, $3, $4, 'citizen') RETURNING id`,
        [name, email, citizenPassword, phone]
      );
      citizens[name] = r.rows[0].id;
    }

    // ── Officers ────────────────────────────────────────────────────────────
    const officerPassword = await bcrypt.hash('officer123', 10);

    const officerData = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@gov.in',
        phone: '9876543210',
        ministry: 'Ministry of Road Transport and Highways',
        designation: 'Section Officer',
        photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
        rating: 4.5,
        total_resolved: 156,
      },
      {
        name: 'Priya Sharma',
        email: 'priya.sharma@gov.in',
        phone: '9876543211',
        ministry: 'Ministry of Power',
        designation: 'Assistant Director',
        photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        rating: 4.8,
        total_resolved: 203,
      },
      {
        name: 'Amit Verma',
        email: 'amit.verma@gov.in',
        phone: '9876543212',
        ministry: 'Ministry of Jal Shakti (Water Resources)',
        designation: 'Deputy Secretary',
        photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        rating: 4.3,
        total_resolved: 178,
      },
      {
        name: 'Sneha Patel',
        email: 'sneha.patel@gov.in',
        phone: '9876543213',
        ministry: 'Central Vigilance Commission',
        designation: 'Investigation Officer',
        photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
        rating: 4.9,
        total_resolved: 89,
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.singh@gov.in',
        phone: '9876543214',
        ministry: 'Ministry of Health and Family Welfare',
        designation: 'Chief Medical Officer',
        photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        rating: 4.7,
        total_resolved: 245,
      },
      {
        name: 'Meera Nair',
        email: 'meera.nair@gov.in',
        phone: '9876543215',
        ministry: 'Ministry of Home Affairs',
        designation: 'Senior Inspector',
        photo_url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400',
        rating: 4.6,
        total_resolved: 198,
      },
    ];

    const officerIds: Record<string, string> = {};
    for (const o of officerData) {
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, phone, role)
         VALUES ($1, $2, $3, $4, 'officer') RETURNING id`,
        [o.name, o.email, officerPassword, o.phone]
      );
      const userId = userRes.rows[0].id;
      officerIds[o.name] = userId;

      await client.query(
        `INSERT INTO officers (id, ministry_id, designation, photo_url, rating, total_resolved)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, ministryIds[o.ministry], o.designation, o.photo_url, o.rating, o.total_resolved]
      );
    }

    // ── Sample Complaints ────────────────────────────────────────────────────
    const complaints = [
      {
        id: 'GRV2026001234',
        citizenName: 'Arjun Mehta',
        ministryName: 'Ministry of Road Transport and Highways',
        officerName: 'Rajesh Kumar',
        category: 'Roads',
        description: 'There is a large pothole on MG Road causing accidents. Multiple vehicles have been damaged. Immediate repair required for public safety.',
        location: 'Mumbai, Maharashtra',
        urgency: 'high',
        status: 'in-progress',
        submittedAt: new Date('2026-02-25T10:30:00'),
      },
      {
        id: 'GRV2026001235',
        citizenName: 'Kavita Singh',
        ministryName: 'Ministry of Power',
        officerName: 'Priya Sharma',
        category: 'Electricity',
        description: 'Power outage in Sector 14 area for the past 3 days. No response from local electricity board. Affecting hospitals and essential services.',
        location: 'Delhi',
        urgency: 'high',
        status: 'assigned',
        submittedAt: new Date('2026-02-26T08:15:00'),
      },
      {
        id: 'GRV2026001236',
        citizenName: 'Rohit Desai',
        ministryName: 'Ministry of Jal Shakti (Water Resources)',
        officerName: null,
        category: 'Water Supply',
        description: 'Irregular water supply in our colony. Water comes only once every 3 days and is often contaminated with brown colour.',
        location: 'Bangalore, Karnataka',
        urgency: 'medium',
        status: 'submitted',
        submittedAt: new Date('2026-02-27T16:45:00'),
      },
    ];

    for (const c of complaints) {
      await client.query(
        `INSERT INTO complaints (id, citizen_id, ministry_id, category, description, location, urgency, status, assigned_officer_id, assigned_at, submitted_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
        [
          c.id,
          citizens[c.citizenName],
          ministryIds[c.ministryName],
          c.category,
          c.description,
          c.location,
          c.urgency,
          c.status,
          c.officerName ? officerIds[c.officerName] : null,
          c.officerName ? c.submittedAt : null,
          c.submittedAt,
        ]
      );
    }

    // ── Sample Messages ──────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO messages (complaint_id, sender_id, sender_role, message, created_at)
       VALUES ($1, $2, 'citizen', $3, $4)`,
      [
        'GRV2026001234',
        citizens['Arjun Mehta'],
        'When will this pothole be fixed? It has been 3 days and another accident happened today.',
        new Date('2026-02-26T10:00:00'),
      ]
    );

    await client.query(
      `INSERT INTO messages (complaint_id, sender_id, sender_role, message, created_at)
       VALUES ($1, $2, 'officer', $3, $4)`,
      [
        'GRV2026001234',
        officerIds['Rajesh Kumar'],
        'Dear Citizen, repair work has been scheduled for tomorrow morning. We sincerely apologize for the inconvenience caused.',
        new Date('2026-02-26T14:20:00'),
      ]
    );

    // ── Complaint History ────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO complaint_history (complaint_id, changed_by_name, old_status, new_status, note)
       VALUES ($1, 'System', NULL, 'submitted', 'Complaint registered by citizen')`,
      ['GRV2026001234']
    );
    await client.query(
      `INSERT INTO complaint_history (complaint_id, changed_by_name, old_status, new_status, note)
       VALUES ($1, 'System', 'submitted', 'assigned', 'Assigned to Rajesh Kumar (Section Officer)')`,
      ['GRV2026001234']
    );
    await client.query(
      `INSERT INTO complaint_history (complaint_id, changed_by, changed_by_name, old_status, new_status, note)
       VALUES ($1, $2, 'Rajesh Kumar', 'assigned', 'in-progress', 'Site inspection completed. Repair crew dispatched.')`,
      ['GRV2026001234', officerIds['Rajesh Kumar']]
    );

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully');
    console.log('\n🔑 Test credentials:');
    console.log('  Citizen:  arjun.mehta@email.com / citizen123');
    console.log('  Officer:  rajesh.kumar@gov.in  / officer123');
    console.log('  Officer:  priya.sharma@gov.in  / officer123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(console.error);
