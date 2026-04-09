export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nickname?: string;
  birthdate?: string;
  gender?: 'male' | 'female';
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  profile_image?: string;
  branch_id?: string;
  converted_user_id?: string;
  created_at: string;
  updated_at: string;
}

export type PersonCreateDTO = Omit<Person, 'id' | 'created_at' | 'updated_at' | 'converted_user_id'>;
export type PersonUpdateDTO = Partial<PersonCreateDTO>;

export const PERSON_IMPORT_COLUMNS = [
  'first_name',
  'last_name',
  'middle_name',
  'nickname',
  'birthdate',
  'gender',
  'address',
  'state',
  'city',
  'country',
  'email',
  'phone',
] as const;

export interface ImportPeopleResult {
  valid: Person[];
  duplicates: Array<{ row: Record<string, any>; reason: string }>;
  invalid: Array<{ row: Record<string, any>; reason: string }>;
}
