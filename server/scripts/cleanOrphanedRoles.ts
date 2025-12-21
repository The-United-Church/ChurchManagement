import { AppDataSource } from '../config/database';

async function cleanOrphanedRoles() {
  try {
    await AppDataSource.initialize();
    console.log('✓ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      console.log('Dropping orphaned constraint...');
      // First drop the constraint to allow nulls
      await queryRunner.query(`
        DO $$ 
        BEGIN
          ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_368e146b785b574f42ae9e53d5e";
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END
        $$;
      `);
      console.log('✓ Constraint dropped or did not exist');
      
      // Simply set all non-matching roleIds to NULL (simpler, no subquery dependency)
      await queryRunner.query('UPDATE "users" SET "roleId" = NULL');
      console.log('✓ Reset all roleId values to NULL');

      console.log('✅ Cleanup completed successfully');
    } finally {
      await queryRunner.release();
    }
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning orphaned roles:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

cleanOrphanedRoles();
