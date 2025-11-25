-- Bloom's Taxonomy Levels Table
CREATE TABLE IF NOT EXISTS bloom_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    level_order INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Outcomes Table
CREATE TABLE IF NOT EXISTS program_outcomes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Outcomes Table
CREATE TABLE IF NOT EXISTS course_outcomes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    assessment_type VARCHAR(50),
    date DATE,
    max_marks DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CO-PO Mapping Table
-- Maps Course Outcomes to Program Outcomes with correlation values
-- correlation_value: 1 = low, 2 = medium, 3 = high correlation
CREATE TABLE IF NOT EXISTS co_po_mapping (
    id SERIAL PRIMARY KEY,
    co_id INTEGER NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
    po_id INTEGER NOT NULL REFERENCES program_outcomes(id) ON DELETE CASCADE,
    correlation_value INTEGER NOT NULL CHECK (correlation_value IN (1, 2, 3)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(co_id, po_id)
);

-- Assessment-CO-Bloom Mapping Table
-- Links assessments to course outcomes and Bloom's taxonomy levels
CREATE TABLE IF NOT EXISTS assessment_co_mapping (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    co_id INTEGER NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
    bloom_level_id INTEGER NOT NULL REFERENCES bloom_levels(id) ON DELETE CASCADE,
    weight DECIMAL(5, 2) DEFAULT 1.0,
    max_marks DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, co_id, bloom_level_id)
);

-- Student Marks Table
CREATE TABLE IF NOT EXISTS student_marks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assessment_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_assessment ON student_marks(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_co_mapping_assessment ON assessment_co_mapping(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_co_mapping_co ON assessment_co_mapping(co_id);
CREATE INDEX IF NOT EXISTS idx_assessment_co_mapping_bloom ON assessment_co_mapping(bloom_level_id);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_co ON co_po_mapping(co_id);
CREATE INDEX IF NOT EXISTS idx_co_po_mapping_po ON co_po_mapping(po_id);

