import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import PgTypes from "pg-types";

// Custom types parser to correctly parse booleans
const BOOL_OID = 16; // PostgreSQL boolean type OID
const sql = neon(process.env.DATABASE_URL || "", {
  types: {
    getTypeParser: (oid: number, format?: any) => {
      // Parse 't'/'f' for booleans correctly
      if (oid === BOOL_OID) {
        return (val: string) => val === 't' || val === 'true' || val === '1';
      }
      // For all other types, use the default parser
      return PgTypes.getTypeParser(oid, format);
    },
  } as any,
});
export const db = drizzle({ client: sql });
