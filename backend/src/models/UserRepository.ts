import { BaseRepository } from './BaseRepository';
import { User, UserTable } from './interfaces';

export class UserRepository extends BaseRepository<User, UserTable> {
  constructor() {
    super('users');
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db(this.tableName).where({ username }).first();
    return result ? this.mapFromTable(result) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db(this.tableName).where({ email }).first();
    return result ? this.mapFromTable(result) : null;
  }

  async findByRole(role: 'administrator' | 'editor' | 'read-only'): Promise<User[]> {
    const results = await this.db(this.tableName).where({ role });
    return results.map(result => this.mapFromTable(result));
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db(this.tableName).where({ id }).update({
      last_login: new Date(),
      updated_at: new Date(),
    });
  }

  protected mapFromTable(tableRow: UserTable): User {
    return {
      id: tableRow.id,
      username: tableRow.username,
      email: tableRow.email,
      passwordHash: tableRow.password_hash,
      role: tableRow.role,
      createdAt: new Date(tableRow.created_at),
      updatedAt: new Date(tableRow.updated_at),
      lastLogin: tableRow.last_login ? new Date(tableRow.last_login) : null,
      isActive: Boolean(tableRow.is_active),
    };
  }

  protected mapToTable(entity: User): UserTable {
    return {
      id: entity.id,
      username: entity.username,
      email: entity.email,
      password_hash: entity.passwordHash,
      role: entity.role,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      last_login: entity.lastLogin,
      is_active: entity.isActive,
    };
  }
}