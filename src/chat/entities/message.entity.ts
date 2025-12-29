import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import type { Conversation } from './conversation.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => require('./conversation.entity').Conversation, (c: Conversation) => c.messages, { onDelete: 'CASCADE' })
  conversation: Conversation;

  @Column({ type: 'varchar' })
  role: 'system' | 'human' | 'ai';

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
