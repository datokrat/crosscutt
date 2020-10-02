import { RemoteDataSource, DataSource } from "./data-source";

// Using the client-side in-memory data source:
export const dataSource = new DataSource();
// Using the Django server:
// export const dataSource = new RemoteDataSource();
