import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedUserTable1749598102198 implements MigrationInterface {
    name = 'AddedUserTable1749598102198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."Users_role_enum" AS ENUM('OWNER', 'ADMIN', 'GROUP_LEADER', 'MEMBER', 'USER')`);
        await queryRunner.query(`CREATE TYPE "public"."Users_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."Users_memberstatus_enum" AS ENUM('ACTIVE', 'INACTIVE', 'VISITOR', 'TRANSFERRED')`);
        await queryRunner.query(`CREATE TYPE "public"."Users_maritalstatus_enum" AS ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED')`);
        await queryRunner.query(`CREATE TABLE "Users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "churchName" character varying, "approximateSize" character varying, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "middleName" character varying, "nickname" character varying, "username" character varying, "phoneNumber" character varying, "password" character varying NOT NULL, "role" "public"."Users_role_enum" NOT NULL DEFAULT 'USER', "birthday" date, "gender" "public"."Users_gender_enum", "jobTitle" character varying, "employer" character varying, "school" character varying, "grade" character varying, "baptismDate" date, "baptismLocation" character varying, "memberStatus" "public"."Users_memberstatus_enum", "state" character varying, "city" character varying, "country" character varying, "postalCode" character varying, "facebookLink" character varying, "maritalStatus" "public"."Users_maritalstatus_enum", "joinDate" date, "familyMembers" text, "profileImg" character varying, "age" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3c3ab3f49a87e6ddb607f3c4945" UNIQUE ("email"), CONSTRAINT "UQ_ffc81a3b97dcbf8e320d5106c0d" UNIQUE ("username"), CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "Users"`);
        await queryRunner.query(`DROP TYPE "public"."Users_maritalstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Users_memberstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Users_gender_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Users_role_enum"`);
    }

}
