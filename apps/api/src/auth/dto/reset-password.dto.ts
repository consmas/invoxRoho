import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordConfirmDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'newPassword must include uppercase, lowercase, number and symbol characters',
  })
  newPassword: string;
}
