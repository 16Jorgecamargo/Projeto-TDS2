import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from './auth.service.js';
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ConfirmVerificationInput,
  OauthInput,
} from './auth.schemas.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
    const result = await this.service.register(req.body);
    return reply.status(201).send(result);
  };

  login = async (req: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.login(req.body));
  };

  refresh = async (req: FastifyRequest<{ Body: RefreshInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.refresh(req.body.refreshToken));
  };

  logout = async (req: FastifyRequest<{ Body: RefreshInput }>, reply: FastifyReply) => {
    await this.service.logout(req.body.refreshToken);
    return reply.status(204).send();
  };

  verifyEmail = async (
    req: FastifyRequest<{ Body: ConfirmVerificationInput }>,
    reply: FastifyReply,
  ) => {
    await this.service.confirmEmailVerification(req.body.token);
    return reply.status(204).send();
  };

  forgotPassword = async (
    req: FastifyRequest<{ Body: RequestPasswordResetInput }>,
    reply: FastifyReply,
  ) => {
    await this.service.requestPasswordReset(req.body.email);
    return reply.status(202).send();
  };

  resetPassword = async (
    req: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply,
  ) => {
    await this.service.resetPassword(req.body.token, req.body.password);
    return reply.status(204).send();
  };

  oauth = async (req: FastifyRequest<{ Body: OauthInput }>, reply: FastifyReply) => {
    return reply.send(await this.service.linkOrLoginOauth(req.body));
  };
}
