import type { Holding } from '../../types/holding';

/**
 * shares     = costAmount / costNav（买入份额，保留 2 位小数）
 * profitRate = (currentAmount - costAmount) / costAmount * 100
 * currentAmount = costAmount * (currentNav / costNav)
 *
 * currentNav 参见 funds.ts；各客户在不同时点买入，costNav 反映买入时净值，
 * 因此 profitRate 与基金本身的 yield1y 均不相同。
 */
export const holdings: Holding[] = [
  // c001 李建国 — 机构/专业，积极
  { id: 'h001', customerId: 'c001', productId: 'f001', shares: 2019230.77, costNav: 2.08,  costAmount: 4200000,  currentAmount: 4964000,  holdingSince: '2023-04-10', profitRate: 18.19 },
  { id: 'h002', customerId: 'c001', productId: 'f004', shares:  730158.73, costNav: 3.15,  costAmount: 2300000,  currentAmount: 3089000,  holdingSince: '2023-06-20', profitRate: 34.30 },
  { id: 'h003', customerId: 'c001', productId: 'f009', shares:  989010.99, costNav: 1.82,  costAmount: 1800000,  currentAmount: 1965000,  holdingSince: '2023-09-01', profitRate:  9.17 },
  { id: 'h022', customerId: 'c001', productId: 'f002', shares:  674603.17, costNav: 2.52,  costAmount: 1700000,  currentAmount: 2107000,  holdingSince: '2024-01-08', profitRate: 23.94 },

  // c002 王雅静 — 机构/专业，稳健
  { id: 'h004', customerId: 'c002', productId: 'f006', shares: 6551724.14, costNav: 1.16,  costAmount: 7600000,  currentAmount: 8085000,  holdingSince: '2023-06-05', profitRate:  6.38 },
  { id: 'h005', customerId: 'c002', productId: 'f007', shares: 4272727.27, costNav: 1.10,  costAmount: 4700000,  currentAmount: 4939000,  holdingSince: '2023-07-15', profitRate:  5.09 },

  // c003 张伟明 — 个人/专业，激进
  { id: 'h006', customerId: 'c003', productId: 'f010', shares:  571428.57, costNav: 2.10,  costAmount: 1200000,  currentAmount: 1579000,  holdingSince: '2023-08-01', profitRate: 31.58 },
  { id: 'h007', customerId: 'c003', productId: 'f004', shares:  554261.36, costNav: 3.52,  costAmount: 1950000,  currentAmount: 2344000,  holdingSince: '2024-01-10', profitRate: 20.21 },
  { id: 'h023', customerId: 'c003', productId: 'f002', shares:  313207.55, costNav: 2.65,  costAmount:  830000,  currentAmount:  978000,  holdingSince: '2024-02-14', profitRate: 17.83 },

  // c004 陈思思 — 机构/专业，平衡
  { id: 'h008', customerId: 'c004', productId: 'f003', shares: 2114285.71, costNav: 1.75,  costAmount: 3700000,  currentAmount: 4000000,  holdingSince: '2023-09-12', profitRate:  8.11 },
  { id: 'h009', customerId: 'c004', productId: 'f001', shares: 1023255.81, costNav: 2.15,  costAmount: 2200000,  currentAmount: 2515000,  holdingSince: '2023-10-20', profitRate: 14.32 },

  // c005 刘海涛 — 个人/普通，保守（风险评估已过期）
  { id: 'h010', customerId: 'c005', productId: 'f008', shares: 3000000.00, costNav: 1.0000, costAmount: 3000000, currentAmount: 3114000, holdingSince: '2022-12-01', profitRate:  3.80 },
  { id: 'h011', customerId: 'c005', productId: 'f007', shares: 1696428.57, costNav: 1.12,  costAmount: 1900000,  currentAmount: 1961000,  holdingSince: '2023-01-20', profitRate:  3.21 },

  // c006 赵丽华 — 机构/专业，稳健
  { id: 'h012', customerId: 'c006', productId: 'f006', shares: 7899159.66, costNav: 1.19,  costAmount: 9400000,  currentAmount: 9748000,  holdingSince: '2023-02-18', profitRate:  3.70 },
  { id: 'h013', customerId: 'c006', productId: 'f003', shares: 2690643.27, costNav: 1.71,  costAmount: 4600000,  currentAmount: 5089000,  holdingSince: '2023-03-25', profitRate: 10.63 },

  // c007 孙晓峰 — 个人/普通，积极（风险评测已过期）
  { id: 'h014', customerId: 'c007', productId: 'f005', shares:  143801.65, costNav: 6.05,  costAmount:  870000,  currentAmount:  816000,  holdingSince: '2024-03-10', profitRate: -6.21 },
  { id: 'h015', customerId: 'c007', productId: 'f011', shares:  385185.19, costNav: 1.35,  costAmount:  520000,  currentAmount:  637000,  holdingSince: '2024-03-10', profitRate: 22.50 },

  // c008 周铭 — 机构/专业，激进
  { id: 'h016', customerId: 'c008', productId: 'f004', shares: 1420118.34, costNav: 3.38,  costAmount: 4800000,  currentAmount: 6009000,  holdingSince: '2023-10-30', profitRate: 25.19 },
  { id: 'h017', customerId: 'c008', productId: 'f010', shares: 1422222.22, costNav: 2.25,  costAmount: 3200000,  currentAmount: 3931000,  holdingSince: '2023-11-15', profitRate: 22.84 },

  // c009 吴晴 — 个人/普通，平衡
  { id: 'h018', customerId: 'c009', productId: 'f001', shares:  200892.86, costNav: 2.24,  costAmount:  450000,  currentAmount:  494000,  holdingSince: '2024-02-01', profitRate:  9.78 },
  { id: 'h019', customerId: 'c009', productId: 'f003', shares:  154285.71, costNav: 1.75,  costAmount:  270000,  currentAmount:  292000,  holdingSince: '2024-02-01', profitRate:  8.15 },

  // c010 马天宇 — 机构/专业，平衡
  { id: 'h020', customerId: 'c010', productId: 'f012', shares: 4397163.12, costNav: 1.41,  costAmount: 6200000,  currentAmount: 6697000,  holdingSince: '2023-12-01', profitRate:  8.02 },
  { id: 'h021', customerId: 'c010', productId: 'f009', shares: 1483516.48, costNav: 1.82,  costAmount: 2700000,  currentAmount: 2948000,  holdingSince: '2023-12-15', profitRate:  9.19 },
];
