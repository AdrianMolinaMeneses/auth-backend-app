import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { Model } from 'mongoose';
import * as bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload';
import { CreateUserDto, LoginDto, RegisterUserDto, UpdateAuthDto } from './dto';
import { LoginResponse } from './interfaces/login-response';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const { password, ...userData } = createUserDto;

      // 1.- Encriptar contraseña
      const newUser = new this.userModel({
        password: bcryptjs.hashSync(password, 10),
        ...userData,
      });

      // 2.- Guardar el usuario
      await newUser.save();

      const { password: _, ...user } = newUser.toJSON();

      return user;
    } catch (error) {
      // 4.- Manejar los errores

      if (error.code === 11000) {
        throw new BadRequestException(`${createUserDto.email} already exists!`);
      }

      throw new InternalServerErrorException('Something terrible happen!!!');
    }
  }

  async register(registerUserDto: RegisterUserDto): Promise<LoginResponse> {
    const user = await this.create(registerUserDto);

    return {
      user: user,
      token: this.getJWT({ id: user._id! }),
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Not valid credentials - email');
    }

    if (!bcryptjs.compareSync(password, user.password!)) {
      throw new UnauthorizedException('Not valid credentials - password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Not valid status - is not active');
    }

    const { password: _, ...rest } = user.toJSON();

    return {
      user: rest,
      token: this.getJWT({ id: user.id }),
    };
  }

  findAll(): Promise<User[]> {
    return this.userModel.find();
  }

  async findUserById(userId: string) {
    const user = await this.userModel.findById(userId);
    const { password, ...rest } = user!.toJSON();
    return rest;
  }

  getJWT(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
  // async findOne(id: string) {
  //   const user = await this.userModel.findById(id);

  //   return user;
  // }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }
}
