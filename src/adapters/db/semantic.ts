export interface SemanticDB {
  insert(documents: any[]): Promise<void>;
  search(query: string, limit: number): Promise<any[]>;
}