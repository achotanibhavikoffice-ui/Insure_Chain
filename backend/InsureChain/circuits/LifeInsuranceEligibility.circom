pragma circom 2.1.1;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/*
 * Life Insurance Eligibility ZKP
 *
 * Private inputs:
 *   income       - applicant's actual financial income
 *   creditScore  - applicant's actual credit score
 *   medicalRisk  - applicant's private medical risk score
 *
 * Public inputs:
 *   minIncome
 *   minCreditScore
 *   maxMedicalRisk
 *
 * Public output:
 *   eligible
 *
 * The circuit proves that the applicant knows private records satisfying
 * the insurer's thresholds without revealing those private records.
 */
template LifeInsuranceEligibility() {
    signal input income;
    signal input creditScore;
    signal input medicalRisk;

    signal input minIncome;
    signal input minCreditScore;
    signal input maxMedicalRisk;

    signal output eligible;

    // Range constraints prevent accidental values outside the intended domain.
    component incomeBits = Num2Bits(64);
    incomeBits.in <== income;

    component creditBits = Num2Bits(16);
    creditBits.in <== creditScore;

    component riskBits = Num2Bits(16);
    riskBits.in <== medicalRisk;

    component minIncomeBits = Num2Bits(64);
    minIncomeBits.in <== minIncome;

    component minCreditBits = Num2Bits(16);
    minCreditBits.in <== minCreditScore;

    component maxRiskBits = Num2Bits(16);
    maxRiskBits.in <== maxMedicalRisk;

    component incomeOk = GreaterEqThan(64);
    incomeOk.in[0] <== income;
    incomeOk.in[1] <== minIncome;

    component creditOk = GreaterEqThan(16);
    creditOk.in[0] <== creditScore;
    creditOk.in[1] <== minCreditScore;

    component riskOk = LessEqThan(16);
    riskOk.in[0] <== medicalRisk;
    riskOk.in[1] <== maxMedicalRisk;

    // All three comparisons must be true (broken down into quadratic steps).
    signal intermediate;
    intermediate <== incomeOk.out * creditOk.out;
    eligible <== intermediate * riskOk.out;
    eligible * (eligible - 1) === 0;
}

component main {public [minIncome, minCreditScore, maxMedicalRisk]} = LifeInsuranceEligibility();