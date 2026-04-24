import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '@common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { RefreshTokenPayload } from './strategies/jwt-refresh.strategy';
import { UsersService } from '@modules/users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @SetMetadata(IS_PUBLIC_KEY, true)
  @ApiOperation({ summary: 'Register a new organization and admin user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @SetMetadata(IS_PUBLIC_KEY, true)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get token pair' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@CurrentUser() user: RefreshTokenPayload) {
    return this.authService.refresh(user.sub, user.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.id, user.tenantId);
  }
}
