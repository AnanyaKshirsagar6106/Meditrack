-- MediTrack Seed Data
-- Categories
INSERT INTO categories (id, nane, type) VALUES ('cat-churna', 'Churna (Powders)', 'MEDICINE');
INSERT INTO categories (id, name, type) VALUES ('cat-vati', 'Vati (Tablets)', 'MEDICINE');
INSERT INTO categories (id, name, type) VALUES ('cat-taila', 'Taila (Oils)', 'MEDICINE');
INSERT INTO categories (id, name, type) VALUES ('cat-kashaya', 'Kashaya', 'MEDICINE');
INSERT INTO categories (id, name, type) VALUES ('cat-herbs', 'Raw Herbs', 'RAW_MATERIAL');
INSERT INTO categories (id, name, type) VALUES ('cat-supply', 'Hospital Supplies', 'SUPPLY');

-- Departments
INSERT INTO departments (id, name) VALUES ('dept-opd', 'OPD');
INSERT INTO departments (id, name) VALUES ('dept-ipd', 'IPD');
INSERT INTO departments (id, name) VALUES ('dept-pharmacy', 'Pharmacy');
INSERT INTO departments (id, name) VALUES ('dept-panchakarma', 'Panchakarma');
INSERT INTO departments (id, name) VALUES ('dept-emergency', 'Emergency');

-- Suppliers
INSERT INTO suppliers (id, name, contactPerson, phone, city, leadTime) VALUES ('sup-herbs', 'Ayurveda Herbs Ltd.', 'Rajesh Kumar', '9876543210', 'Jaipur', 7);
INSERT INTO suppliers (id, name, contactPerson, phone, city, leadTime) VALUES ('sup-pharma', 'Dhanvantari Pharmaceuticals', 'Priya Sharma', '9876543211', 'Mumbai', 10);
INSERT INTO suppliers (id, name, contactPerson, phone, city, leadTime) VALUES ('sup-surgical', 'Sushruta Surgical', 'Amit Patel', '9876543212', 'Delhi', 5);

-- Storage Locations
INSERT INTO storage_locations (id, name, type) VALUES ('loc-a1', 'Shelf A1', 'shelf');
INSERT INTO storage_locations (id, name, type) VALUES ('loc-a2', 'Shelf A2', 'shelf');
INSERT INTO storage_locations (id, name, type) VALUES ('loc-fridge', 'Refrigerator B1', 'fridge');

-- System Settings
INSERT INTO system_settings (key, value) VALUES ('app_name', 'MediTrack');
INSERT INTO system_settings (key, value) VALUES ('hospital_name', 'Ayurvedic Hospital');
INSERT INTO system_settings (key, value) VALUES ('currency', 'INR');
INSERT INTO system_settings (key, value) VALUES ('low_stock_threshold', '10');
INSERT INTO system_settings (key, value) VALUES ('critical_stock_threshold', '5');