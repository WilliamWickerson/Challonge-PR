var Gauss = require('free-gaussian');

var curve = Gauss(0,1)
beta = (25/6);
tao = Math.pow((25/300),2);
sigma2 = Math.pow((25/3),2) + tao;
c = 2*Math.pow(beta,2) + sigma2 + sigma2;
console.log(sigma2, c);
console.log(curve.pdf(0) / curve.cdf(0));
console.log(25 + sigma2/Math.sqrt(c) * curve.pdf(0) / curve.cdf(0));
console.log(Math.sqrt(sigma2)*Math.sqrt(1 - sigma2/c * Math.pow(curve.pdf(0)/curve.cdf(0), 2)));