export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
};
