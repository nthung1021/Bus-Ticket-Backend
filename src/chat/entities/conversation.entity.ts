import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
// Avoid direct type import to prevent TS resolution issues in this workspace

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title?: string;

  @OneToMany(() => require('./message.entity').Message, (m: any) => m.conversation, { cascade: true })
  messages: any[];
}
