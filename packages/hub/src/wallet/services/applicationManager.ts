import {Address} from '../../types';
import Rule from '../models/rule';

interface Application {
  address: Address;
  name: string;
}
export async function getApplications(): Promise<Application[]> {
  return Rule.query().select('address', 'name');
}
