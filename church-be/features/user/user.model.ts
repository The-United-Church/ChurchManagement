import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from "bcrypt";

export enum UserRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    GROUP_LEADER = 'GROUP_LEADER',
    MEMBER = 'MEMBER',
    USER = 'USER'
}

export enum MemberStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    VISITOR = 'VISITOR',
    TRANSFERRED = 'TRANSFERRED'
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER'
}

export enum MaritalStatus {
    SINGLE = 'SINGLE',
    MARRIED = 'MARRIED',
    DIVORCED = 'DIVORCED',
    WIDOWED = 'WIDOWED',
    SEPARATED = 'SEPARATED'
}

@Entity("Users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    churchName: string;

    @Column({ nullable: true })
    approximateSize: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ nullable: true })
    middleName: string;

    @Column({ nullable: true })
    nickname: string;

    @Column({ unique: true, nullable: true })
    username: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column()
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER
    })
    role: UserRole;

    @Column({ type: 'date', nullable: true })
    birthday: Date;

    @Column({
        type: 'enum',
        enum: Gender,
        nullable: true
    })
    gender: Gender;

    @Column({ nullable: true })
    jobTitle: string;

    @Column({ nullable: true })
    employer: string;

    @Column({ nullable: true })
    school: string;

    @Column({ nullable: true })
    grade: string;

    @Column({ type: 'date', nullable: true })
    baptismDate: Date;

    @Column({ nullable: true })
    baptismLocation: string;

    @Column({
        type: 'enum',
        enum: MemberStatus,
        nullable: true
    })
    memberStatus: MemberStatus;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    city: string;

    @Column({ default: false })
    isVerified: boolean;

    @Column({ nullable: true })
    country: string;

    @Column('simple-json', { nullable: true })
    socialMedia: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedIn?: string;
        youtube?: string;
        tiktok?: string;
    };

    @Column({ nullable: true })
    postalCode: string;

    // @Column({ nullable: true })
    // facebookLink: string;

    @Column({
        type: 'enum',
        enum: MaritalStatus,
        nullable: true
    })
    maritalStatus: MaritalStatus;

    @Column({ type: 'date', nullable: true })
    joinDate: Date;

    @Column('simple-json', { nullable: true })
    familyMembers: { name: string, relationship: string }[];

    @Column({ nullable: true })
    profileImg: string;

    @Column({ nullable: true })
    age: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}