/* Cassola Access Registry v0.2
 * Public repository rule:
 * - NEVER put plaintext access codes or real employee names in this file.
 * - Static hashes are a casual-access gate, not server-grade authentication.
 */
window.CassolaAccessRegistry={
  version:2,
  kdf:"PBKDF2-SHA256",
  credentials:[
    {
      id:"supervisor",
      role:"supervisor",
      label:"Supervisor",
      salt:"4d7/DdwzJLDR89XawmE/ag==",
      hash:"QAFbulqbdKUrBXk5IGUW60yYddmArUvNHp2VN/HEFk0=",
      iterations:200000
    },
    {
      id:"produce_a",
      role:"employee",
      label:"蔬果员工 A",
      scope:{id:"produce",kind:"category",value:"蔬果",label:"🥬 蔬果"},
      salt:"SF6sOxCEZrjmyc7MRJUJqA==",
      hash:"POYVEl/Nsf6Rx15TjB7YurG/wkckI/5/E3YP7NFXLwY=",
      iterations:200000
    },
    {
      id:"produce_b",
      role:"employee",
      label:"蔬果员工 B",
      scope:{id:"produce",kind:"category",value:"蔬果",label:"🥬 蔬果"},
      salt:"hIG81qWkbwzU9ZSzhOSXLg==",
      hash:"Ktr+Zm/AajTvcdErCMj1RiuU3Mzq4d95MpL4Fy/6N1M=",
      iterations:200000
    }
  ]
};
