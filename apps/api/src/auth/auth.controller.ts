import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { SwitchContextDto } from "./dto/switch-context.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === "test" ? 1000 : 5, ttl: 60000 },
  })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({
    default: { limit: process.env.NODE_ENV === "test" ? 1000 : 5, ttl: 60000 },
  })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest) {
    const ip = req.ip || req.headers["x-forwarded-for"]?.toString();
    const userAgent = req.headers["user-agent"] || undefined;
    return this.authService.login(dto, ip, userAgent);
  }

  @Get("me")
  async getMe(@CurrentUser("id") userId: string) {
    return this.authService.getMe(userId);
  }

  @Post("switch-context")
  @HttpCode(HttpStatus.OK)
  async switchContext(
    @CurrentUser("id") userId: string,
    @Body() dto: SwitchContextDto,
  ) {
    return this.authService.switchContext(userId, dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser("id") userId: string) {
    return this.authService.logout(userId);
  }
}
