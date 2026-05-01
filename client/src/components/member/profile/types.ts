export interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  birthdate?: string;
  gender?: string;
  phone?: string;
  marital_status?: string;
  email?: string;
  /** When this family member already has an account in the app. */
  linked_user_id?: string;
}

export interface ProfileForm {
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  dob: string;
  gender: string;
  marital_status: string;
  date_married: string;
  phone_number: string;
  phone_is_whatsapp: boolean;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  username: string;
  job_title: string;
  employer: string;
  facebook_link: string;
  is_display_email: boolean;
  is_accept_text: boolean;
  grade: string;
  baptism_date: string;
  baptism_location: string;
  member_status: string;
}

export const EMPTY_FAMILY: Omit<FamilyMember, 'id'> = {
  first_name: '',
  last_name: '',
  relationship: '',
  birthdate: '',
  gender: '',
  phone: '',
  marital_status: '',
  email: '',
  linked_user_id: '',
};

export const RELATIONSHIP_OPTIONS = [
  { value: 'Grandparent', label: 'Grandparent' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Child', label: 'Child' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Other', label: 'Other' },
];

export const MARITAL_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'separated', label: 'Separated' },
];

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export const MEMBER_STATUS_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'attender', label: 'Attender' },
  { value: 'visitor', label: 'Visitor' },
];
