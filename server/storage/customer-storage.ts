import { db } from "../db.js";
import { customers, type Customer, type InsertCustomer } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les clients (customers)
 * Gère les opérations CRUD pour les clients
 */
export class CustomerStorage extends BaseStorage {
  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      return result[0];
    } catch (e) {
      this.log('error', 'getCustomerByPhone failed', e);
      throw e;
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const customerId = randomUUID();
    const customerWithId = { ...customer, id: customerId };
    
    try {
      await db.insert(customers).values(customerWithId);
    } catch (e) {
      this.log('error', 'Insert customer failed', e);
      throw e;
    }
    
    try {
      const result = await db.select().from(customers).where(eq(customers.id, customerId));
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Select returned empty result");
      }
      return result[0];
    } catch (e) {
      this.log('error', 'Select customer failed', e);
      throw e;
    }
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    try {
      await db.update(customers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(customers.id, id));
      
      const result = await db.select().from(customers).where(eq(customers.id, id));
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("Customer not found");
      }
      return result[0];
    } catch (e) {
      this.log('error', 'updateCustomer failed', e);
      throw e;
    }
  }
}
