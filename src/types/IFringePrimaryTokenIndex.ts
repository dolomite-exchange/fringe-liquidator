/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import { FunctionFragment, Result } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";

export interface IFringePrimaryTokenIndexInterface extends utils.Interface {
  contractName: "IFringePrimaryTokenIndex";
  functions: {
    "getPosition(address,address,address)": FunctionFragment;
    "liquidate(address,address,address)": FunctionFragment;
    "redeem(address,uint256)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "getPosition",
    values: [string, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "liquidate",
    values: [string, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "redeem",
    values: [string, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "getPosition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "liquidate", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "redeem", data: BytesLike): Result;

  events: {};
}

export interface IFringePrimaryTokenIndex extends BaseContract {
  contractName: "IFringePrimaryTokenIndex";
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IFringePrimaryTokenIndexInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    getPosition(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        depositedProjectTokenAmount: BigNumber;
        loanBody: BigNumber;
        accrual: BigNumber;
        healthFactorNumerator: BigNumber;
        healthFactorDenominator: BigNumber;
      }
    >;

    liquidate(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    redeem(
      lendingToken: string,
      bLendingTokenAmount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  getPosition(
    account: string,
    projectToken: string,
    lendingToken: string,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
      depositedProjectTokenAmount: BigNumber;
      loanBody: BigNumber;
      accrual: BigNumber;
      healthFactorNumerator: BigNumber;
      healthFactorDenominator: BigNumber;
    }
  >;

  liquidate(
    account: string,
    projectToken: string,
    lendingToken: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  redeem(
    lendingToken: string,
    bLendingTokenAmount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    getPosition(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        depositedProjectTokenAmount: BigNumber;
        loanBody: BigNumber;
        accrual: BigNumber;
        healthFactorNumerator: BigNumber;
        healthFactorDenominator: BigNumber;
      }
    >;

    liquidate(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: CallOverrides
    ): Promise<void>;

    redeem(
      lendingToken: string,
      bLendingTokenAmount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    getPosition(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    liquidate(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    redeem(
      lendingToken: string,
      bLendingTokenAmount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getPosition(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    liquidate(
      account: string,
      projectToken: string,
      lendingToken: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    redeem(
      lendingToken: string,
      bLendingTokenAmount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}