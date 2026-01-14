import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  CreatePaymentDto,
  ConfirmPaymentRequestDto,
  CancelPaymentRequestDto,
  GetPaymentDto,
  PaymentWebhookDto,
  InitiatePaymentRequestDto,
} from './dto/payment-request.dto';
import {
  PaymentResponseDto,
  InitiatePaymentResponseDto,
  PaymentListResponseDto,
} from './dto/payment-response.dto';
import { TossPaymentApiService } from './services/toss-payment-api.service';
import { ERoleName } from '../roles/enums/role.enum';
import { Roles } from 'src/libs/decorator/roles.decorator';
import { ResponseModel } from 'src/libs/models/response';
/**
 * Interface for authenticated request with user info
 */
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    name: string;
    email?: string;
    roles?: string[];
  };
}

@ApiTags('Payment')
@Controller('payment')

@ApiBearerAuth()
@Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly tossApiService: TossPaymentApiService,
  ) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a new payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated successfully',
    type: InitiatePaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  // @UseGuards(AuthGuard) // Add your auth guard here
  // @ApiBearerAuth()
  async initiatePayment(
    @Req() req: AuthenticatedRequest,
    @Body() initiatePaymentDto: InitiatePaymentRequestDto
  ) {
    const responseModel = new ResponseModel();
    try {
      const userId = req.user.sub;
      const payment = await this.paymentService.initiatePayment(
        userId, 
        initiatePaymentDto.cartItems, 
        initiatePaymentDto.points,
        initiatePaymentDto.deliveryFee,
        initiatePaymentDto.userShippingAddressId
      );
      responseModel.setData(payment);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm payment after checkout' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Payment confirmation failed' })
  async confirmPayment(
    @Body() confirmDto: ConfirmPaymentRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaymentResponseDto> {
    // Set userId from authenticated request
    const dto = { ...confirmDto, userId: req.user.sub };
    return this.paymentService.confirmPayment(dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel payment (full or partial)' })
  @ApiResponse({
    status: 200,
    description: 'Payment canceled successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Payment cancellation failed' })
  // @UseGuards(AuthGuard) // Add your auth guard here
  // @ApiBearerAuth()
  async cancelPayment(
    @Body() cancelDto: CancelPaymentRequestDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.cancelPayment(cancelDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get payments with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of payments',
    type: PaymentListResponseDto,
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  // @UseGuards(AuthGuard) // Add your auth guard here
  // @ApiBearerAuth()
  async getPayments(
    @Query() query: GetPaymentDto,
  ): Promise<PaymentListResponseDto> {
    return this.paymentService.getPayments(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment details',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  // @UseGuards(AuthGuard) // Add your auth guard here
    // @ApiBearerAuth()
    // async getPaymentById(@Param('id') id: string): Promise<PaymentResponseDto> {
    //   return this.paymentService.getPaymentById(id);
    // }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment details',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentByOrderId(
    @Param('orderId') orderId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentByOrderId(orderId);
  }

  @Get('key/:paymentKey')
  @ApiOperation({ summary: 'Get payment by payment key' })
  @ApiParam({ name: 'paymentKey', description: 'Toss payment key' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment details',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentByKey(
    @Param('paymentKey') paymentKey: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentByKey(paymentKey);
  }

  @Post('sync/:paymentKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync payment with Toss (get latest status)' })
  @ApiParam({ name: 'paymentKey', description: 'Toss payment key' })
  @ApiResponse({
    status: 200,
    description: 'Payment synced successfully',
    type: PaymentResponseDto,
  })
  async syncPayment(
    @Param('paymentKey') paymentKey: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.syncPayment(paymentKey);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns payment statistics',
  })
  // @UseGuards(AuthGuard) // Add your auth guard here
  // @ApiBearerAuth()
  async getPaymentStats(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.paymentService.getPaymentStats(userId, start, end);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook endpoint for Toss payment notifications',
    description:
      'This endpoint receives payment status updates from Toss (e.g., virtual account deposits)',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or payload',
  })
  
  handleWebhook(
    @Headers('toss-signature') signature: string,
    @Body() payload: PaymentWebhookDto,
  ): any{
    this.logger.log('Received webhook from Toss', {
      eventType: payload.eventType,
    });

    // Verify webhook signature
    const isValid = this.tossApiService.verifyWebhook(
      signature,
      JSON.stringify(payload),
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process webhook
    this.paymentService.handleWebhook(payload.eventType, payload.data);

    return { success: true };
  }
}
