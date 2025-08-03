import { Knex } from 'knex';
import db from '../config/database';

export abstract class BaseRepository<T, TTable> {
  protected db: Knex;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db(this.tableName).where({ id }).first();
    return result ? this.mapFromTable(result) : null;
  }

  async findAll(): Promise<T[]> {
    const results = await this.db(this.tableName).select('*');
    return results.map(result => this.mapFromTable(result));
  }

  async create(data: Omit<TTable, 'created_at' | 'updated_at'>): Promise<T> {
    const now = new Date();
    const insertData = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    await this.db(this.tableName).insert(insertData);
    const created = await this.findById((data as any).id);
    if (!created) {
      throw new Error('Failed to create record');
    }
    return created;
  }

  async update(id: string, data: Partial<TTable>): Promise<T | null> {
    const updateData = {
      ...data,
      updated_at: new Date(),
    };

    await this.db(this.tableName).where({ id }).update(updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.db(this.tableName).where({ id }).del();
    return deletedCount > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db(this.tableName).where({ id }).first();
    return !!result;
  }

  protected abstract mapFromTable(tableRow: TTable): T;
  protected abstract mapToTable(entity: T): TTable;
}