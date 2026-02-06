# Database Migration Scripts

This directory contains SQL migration scripts for the Supabase database. Run these scripts in order to create the complete database schema.

## Migration Order

1. **001_create_users_table.sql** - Creates users table with profile information
2. **002_create_projects_table.sql** - Creates projects table with priority calculation
3. **003_create_project_volunteers_table.sql** - Creates project-volunteer junction table
4. **004_create_outils_table.sql** - Creates tools table
5. **005_create_project_outil_requests_table.sql** - Creates project tool requests
6. **006_create_outil_offerings_table.sql** - Creates tool offerings/lending
7. **007_create_materiel_table.sql** - Creates materials table
8. **008_create_materiel_offerings_table.sql** - Creates material offerings
9. **009_create_transport_table.sql** - Creates transport table
10. **010_create_transport_offerings_table.sql** - Creates transport offerings
11. **011_create_indexes_and_final_setup.sql** - Creates additional indexes, triggers, and views

## Features Included

### Security

- Row Level Security (RLS) enabled on all tables
- Comprehensive RLS policies for each table
- User-based access controls

### Performance

- Indexes on all foreign keys
- Indexes on frequently queried columns
- Composite indexes for complex queries
- Partial indexes for filtered queries

### Database Features

- Generated columns (priority calculation)
- Check constraints for status fields
- Cascade deletions where appropriate
- Automatic availability updates for tools
- Project statistics function
- Project summary view

### Key Tables

- **users**: User profiles and authentication
- **projects**: Community projects with priority calculation
- **project_volunteers**: Volunteer assignments
- **outils**: Tools available for borrowing
- **materiel**: Materials available for donation
- **transport**: Transportation services
- **\_offerings tables**: Offering/lending relationships

## Usage

1. Connect to your Supabase database
2. Run each migration script in order
3. Verify tables and policies are created correctly

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE`
- UUIDs are auto-generated for user IDs
- Serial integers for other primary keys
- JSONB used for flexible data (available_days)
- Comprehensive error handling and constraints
